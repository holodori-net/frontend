import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithProgress, mapConcurrent } from '../service-worker/transfer'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('offline resource transfer progress', () => {
  it('continues transfers longer than the idle timeout while bytes arrive', async () => {
    vi.useFakeTimers()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        setTimeout(
          () => controller.enqueue(new TextEncoder().encode('some')),
          45_000,
        )
        setTimeout(() => {
          controller.enqueue(new TextEncoder().encode(' data'))
          controller.close()
        }, 90_000)
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(stream)),
    )
    const progress: number[] = []
    const pending = fetchWithProgress(
      'https://assets.example/resource.bin',
      (bytes) => progress.push(bytes),
    )
    await vi.advanceTimersByTimeAsync(95_000)
    const response = await pending
    expect(await response.text()).toBe('some data')
    expect(progress).toEqual([4, 5])
  })

  it('aborts a stalled request with its resource URL', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_request, options: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            options.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            )
          }),
      ),
    )
    const pending = expect(
      fetchWithProgress('https://assets.example/resource.bin'),
    ).rejects.toThrow('Download timed out https://assets.example/resource.bin')
    await vi.advanceTimersByTimeAsync(60_000)
    await pending
  })
})

describe('offline transfer concurrency', () => {
  it('limits concurrent downloads and reports every completed resource', async () => {
    const active = { current: 0, peak: 0 }
    const completed: string[] = []
    await mapConcurrent(['a', 'b', 'c', 'd', 'e'], 2, async (url) => {
      active.current += 1
      active.peak = Math.max(active.peak, active.current)
      await new Promise((resolve) => setTimeout(resolve, 1))
      completed.push(url)
      active.current -= 1
    })

    expect(active.peak).toBe(2)
    expect(completed.sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('rejects a partially failed download so its caller can keep the prior selection', async () => {
    const downloaded = new Set<string>()
    await expect(
      mapConcurrent(['page', 'payload', 'resource'], 2, async (url) => {
        if (url === 'payload') throw new Error('network failure')
        downloaded.add(url)
      }),
    ).rejects.toThrow('network failure')

    expect(downloaded.has('payload')).toBe(false)
  })

  it('waits for active downloads to settle before reporting a failure', async () => {
    let settled = false
    await expect(
      mapConcurrent(['fail', 'slow', 'not-started'], 2, async (url) => {
        if (url === 'fail') throw new Error('network failure')
        await new Promise((resolve) => setTimeout(resolve, 5))
        settled = true
      }),
    ).rejects.toThrow('network failure')
    expect(settled).toBe(true)
  })
})
