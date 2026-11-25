import '#nitro-internal-pollyfills'
import { fileURLToPath } from 'node:url'
import Tinypool from 'tinypool'
import { useNitroApp } from 'nitropack/runtime'
import {
  createPrerenderTask,
  restorePrerenderResponse,
  type PrerenderResult,
  type PrerenderTask,
} from './protocol'
import { PrerenderTaskRunner } from './task-runner'
import { getPrerenderWorkerCount } from './worker-count'
import { shareCardIconUrlsWithWorkers } from '../../server/data/card-icons'

const nitroApp = useNitroApp()
const workerCount = getPrerenderWorkerCount(process.env.NUXT_PRERENDER_WORKERS)
const isWorkerThread = Tinypool.isWorkerThread
let taskRunner: Promise<PrerenderTaskRunner> | undefined

async function createTaskRunner() {
  // Worker threads inherit the atlas snapshot when the pool starts.
  await shareCardIconUrlsWithWorkers()
  return new PrerenderTaskRunner(
    new Tinypool({
      filename: fileURLToPath(import.meta.url),
      minThreads: workerCount,
      maxThreads: workerCount,
      concurrentTasksPerWorker: 1,
      useAtomics: false,
    }),
  )
}

if (!isWorkerThread) console.info(`[prerender] workers ${workerCount}`)

export async function renderPrerenderRoute({
  route,
  headers,
  retry,
  retryDelay,
}: PrerenderTask): Promise<PrerenderResult> {
  const response = await nitroApp.localFetch(route, {
    headers: Object.fromEntries(headers),
    retry,
    retryDelay,
  })
  return {
    status: response.status,
    statusText: response.statusText,
    headers: Array.from(response.headers.entries()),
    body: await response.arrayBuffer(),
  }
}

export const localFetch: typeof nitroApp.localFetch = async (input, init) => {
  if (isWorkerThread) return nitroApp.localFetch(input, init)

  const runner = await (taskRunner ??= createTaskRunner())
  const task = createPrerenderTask(input, init)
  try {
    const result = await runner.run<PrerenderResult>(
      task,
      task.route,
      'renderPrerenderRoute',
    )
    return restorePrerenderResponse(result)
  } catch (cause) {
    throw runner.recordFailure(cause, `route ${task.route}`)
  }
}

export async function closePrerenderer() {
  let closeError: unknown
  try {
    await (await taskRunner)?.destroy()
  } catch (error) {
    closeError = error
  }

  try {
    await nitroApp.hooks.callHook('close')
  } catch (error) {
    if (!closeError) closeError = error
  }
  if (closeError) throw closeError
}
