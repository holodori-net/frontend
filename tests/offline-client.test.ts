import { afterEach, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import {
  getOfflinePages,
  saveOfflinePages,
  getOfflineStatus,
  syncOfflinePages,
} from '../app/utils/offline-pages'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('uses home and cards by default and saves language-specific selections', () => {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  })

  expect(getOfflinePages('ja', 'jpn')).toEqual(['home', 'cards'])
  saveOfflinePages('ja', 'jpn', ['home', 'characters'])
  expect(getOfflinePages('ja', 'jpn')).toEqual(['home', 'characters'])
  expect(getOfflinePages('en', 'eng')).toEqual(['home', 'cards'])
})

it('posts a cloneable selection and treats progress separately from completion', async () => {
  const messages: unknown[] = []
  const worker = {
    postMessage(message: unknown, ports: MessagePort[]) {
      messages.push(structuredClone(message))
      ports[0]!.postMessage({ type: 'progress', completed: 1, total: 4 })
      ports[0]!.postMessage({ type: 'result', success: true })
      ports[0]!.close()
    },
  }
  const registration = { active: worker }
  vi.stubGlobal('window', { setTimeout, clearTimeout })
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistration: async () => registration,
      ready: Promise.resolve(registration),
      controller: worker,
    },
  })
  const progress = vi.fn()
  const pending = syncOfflinePages(
    { siteLocale: 'ja', gameLocale: 'jpn', pages: reactive(['home', 'cards']) },
    { onProgress: progress },
  )
  await expect(pending).resolves.toMatchObject({ success: true })
  expect(progress).toHaveBeenCalledWith({
    type: 'progress',
    completed: 1,
    total: 4,
  })
  expect(messages).toEqual([
    {
      type: 'SYNC_OFFLINE_PAGES',
      siteLocale: 'ja',
      gameLocale: 'jpn',
      pages: ['home', 'cards'],
    },
  ])
})

it('times out while waiting for service worker readiness', async () => {
  vi.useFakeTimers()
  const registration = { active: null }
  vi.stubGlobal('window', { setTimeout, clearTimeout })
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistration: async () => registration,
      ready: new Promise(() => {}),
      controller: null,
    },
  })

  const pending = expect(
    syncOfflinePages({ siteLocale: 'ja', gameLocale: 'jpn', pages: ['home'] }),
  ).rejects.toThrow('Service worker is not ready')
  await vi.advanceTimersByTimeAsync(10_000)
  await pending
})

it('uses the typed status request and returns the worker selection', async () => {
  const worker = {
    postMessage: vi.fn((_message: unknown, ports: MessagePort[]) => {
      ports[0]!.postMessage({
        type: 'result',
        success: true,
        selection: {
          cacheName: 'offline',
          siteLocale: 'ja',
          gameLocale: 'jpn',
          pages: ['home'],
        },
        urls: ['/ja/jpn/'],
      })
      ports[0]!.close()
    }),
  }
  const registration = { active: worker }
  vi.stubGlobal('window', { setTimeout, clearTimeout })
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistration: async () => registration,
      ready: Promise.resolve(registration),
      controller: worker,
    },
  })

  await expect(getOfflineStatus()).resolves.toMatchObject({
    selection: { cacheName: 'offline', pages: ['home'] },
    urls: ['/ja/jpn/'],
  })
  expect(worker.postMessage).toHaveBeenCalledWith(
    { type: 'GET_OFFLINE_STATUS' },
    [expect.any(MessagePort)],
  )
})

it('refreshes the inactivity deadline on progress and rejects a stalled transfer', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  let workerPort: MessagePort | undefined
  let notifyPosted!: () => void
  const posted = new Promise<void>((resolve) => (notifyPosted = resolve))
  const worker = {
    postMessage(_message: unknown, ports: MessagePort[]) {
      workerPort = ports[0]!
      notifyPosted()
    },
  }
  const registration = { active: worker }
  vi.stubGlobal('window', { setTimeout, clearTimeout })
  vi.stubGlobal('navigator', {
    serviceWorker: {
      getRegistration: async () => registration,
      ready: Promise.resolve(registration),
      controller: worker,
    },
  })
  let notifyProgress!: () => void
  const progress = new Promise<void>((resolve) => (notifyProgress = resolve))
  const pending = syncOfflinePages(
    { siteLocale: 'ja', gameLocale: 'jpn', pages: ['home'] },
    { onProgress: () => notifyProgress() },
  )
  let settled = false
  void pending.then(
    () => (settled = true),
    () => (settled = true),
  )
  const rejected = expect(pending).rejects.toThrow(
    'Offline storage stopped responding',
  )
  try {
    await posted
    await vi.advanceTimersByTimeAsync(119_000)
    workerPort!.postMessage({ type: 'progress', completed: 1, total: 4 })
    await progress
    await vi.advanceTimersByTimeAsync(119_000)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1_000)
    await rejected
  } finally {
    workerPort?.close()
  }
})
