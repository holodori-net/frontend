import { afterEach, describe, expect, it } from 'vitest'
import Tinypool from 'tinypool'
import { fileURLToPath } from 'node:url'
import type { TestResult } from './fixtures/prerender-task.ts'
import { PrerenderTaskRunner } from '../scripts/prerender/task-runner.ts'
import {
  createPrerenderTask,
  restorePrerenderResponse,
} from '../scripts/prerender/protocol.ts'

const fixturePath = new URL('./fixtures/prerender-task.ts', import.meta.url)
const runners: Array<{ runner: PrerenderTaskRunner; pool: Tinypool }> = []

function createRunner(size: number) {
  const pool = new Tinypool({
    filename: fileURLToPath(fixturePath),
    minThreads: size,
    maxThreads: size,
    concurrentTasksPerWorker: 1,
    useAtomics: false,
  })
  const runner = new PrerenderTaskRunner(pool)
  runners.push({ runner, pool })
  return { runner, pool }
}

function withTimeout<T>(promise: Promise<T>, description: string) {
  let timer: ReturnType<typeof setTimeout>
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Timed out waiting for ${description}`)),
        5_000,
      )
    }),
  ]).finally(() => clearTimeout(timer!))
}

function waitForWorkerExit(workers: Tinypool['threads']) {
  return workers.map(
    (worker) => new Promise<void>((resolve) => worker.once('exit', resolve)),
  )
}

afterEach(async () => {
  await Promise.all(
    runners
      .splice(0)
      .map(({ runner }) =>
        withTimeout(runner.destroy(), 'worker pool cleanup').catch(
          () => undefined,
        ),
      ),
  )
})

describe('prerender worker task runner', () => {
  it('keeps concurrent route results associated with their requests', async () => {
    const { runner, pool } = createRunner(3)
    const workers = [...pool.threads]
    const workerExits = waitForWorkerExit(workers)
    const results = await withTimeout(
      Promise.all(
        Array.from({ length: 9 }, (_, index) => {
          const route = `/route-${index}`
          return runner.run<TestResult>({ route }, route, 'renderTestTask')
        }),
      ),
      'all route renders',
    )

    expect(results.map((result) => result.route)).toEqual(
      Array.from({ length: 9 }, (_, index) => `/route-${index}`),
    )
    expect(new Set(results.map((result) => result.threadId)).size).toBe(3)

    await withTimeout(runner.destroy(), 'successful pool close')
    await withTimeout(Promise.all(workerExits), 'worker exits')
    expect(pool.threads).toHaveLength(0)
  }, 10_000)

  it('passes request headers and retries and rebuilds binary and empty responses', async () => {
    const request = createPrerenderTask('/response', {
      headers: { 'x-prerender': 'yes' },
      retry: 3,
      retryDelay: 500,
    })
    expect(request).toEqual({
      route: '/response',
      headers: [['x-prerender', 'yes']],
      retry: 3,
      retryDelay: 500,
    })

    const { runner } = createRunner(1)
    const result = await withTimeout(
      runner.run<TestResult>(
        {
          route: request.route,
          headers: request.headers,
          retry: request.retry,
          retryDelay: request.retryDelay,
          status: 201,
          statusText: 'Created',
          responseHeaders: [['content-type', 'application/octet-stream']],
          body: new Uint8Array([0, 1, 127, 128, 254, 255]).buffer,
        },
        request.route,
        'renderTestTask',
      ),
      'binary render',
    )
    const response = restorePrerenderResponse(result)
    expect(result.requestHeaders).toEqual(request.headers)
    expect(result.retry).toBe(request.retry)
    expect(result.retryDelay).toBe(request.retryDelay)
    expect(response.status).toBe(201)
    expect(response.statusText).toBe('Created')
    expect(response.headers.get('content-type')).toBe(
      'application/octet-stream',
    )
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([
      0, 1, 127, 128, 254, 255,
    ])

    const emptyResponse = restorePrerenderResponse({
      status: 204,
      statusText: 'No Content',
      headers: [],
      body: new ArrayBuffer(0),
    })
    expect(emptyResponse.status).toBe(204)
    expect(await emptyResponse.text()).toBe('')
  }, 10_000)

  it('rejects failed and pending renders and rethrows on close', async () => {
    const { runner, pool } = createRunner(2)
    const workers = [...pool.threads]
    const workerExits = waitForWorkerExit(workers)
    const failed = runner.run(
      { mode: 'throw', route: '/throw' },
      '/throw',
      'renderTestTask',
    )
    const pending = runner.run(
      { route: '/pending', delay: 200 },
      '/pending',
      'renderTestTask',
    )

    const results = await Promise.allSettled([
      withTimeout(failed, 'failed render'),
      withTimeout(pending, 'pending render rejection'),
    ])
    expect(results).toHaveLength(2)
    expect(results.every((result) => result.status === 'rejected')).toBe(true)
    expect(runner.failure?.cause).toBeInstanceOf(Error)
    expect(runner.failure?.message).toContain(
      'Prerender failed (route /throw): fixture render failed',
    )
    await expect(
      withTimeout(runner.destroy(), 'failed pool close'),
    ).rejects.toThrow('Prerender failed (route /throw): fixture render failed')
    await withTimeout(
      Promise.all(workerExits),
      'worker exits after render failure',
    )
    expect(pool.threads).toHaveLength(0)
  }, 10_000)

  it.each([0, 9])(
    'fails and cleans up after an unexpected worker exit (%i)',
    async (code) => {
      const { runner, pool } = createRunner(1)
      const workers = [...pool.threads]
      const workerExits = waitForWorkerExit(workers)
      const task = runner.run(
        { mode: 'exit', exitCode: code, route: '/exit' },
        '/exit',
        'renderTestTask',
      )

      await expect(withTimeout(task, 'worker exit')).rejects.toThrow(
        `Worker thread ${workers[0]?.threadId} exited unexpectedly with code ${code}`,
      )
      await expect(
        withTimeout(runner.destroy(), 'worker exit cleanup'),
      ).rejects.toThrow(`code ${code}`)
      await withTimeout(Promise.all(workerExits), 'worker exit cleanup')
      expect(pool.threads).toHaveLength(0)
    },
    10_000,
  )
})
