import { afterEach, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import {
  getOfflinePages,
  saveOfflinePages,
  syncOfflinePages,
} from '../app/composables/useOfflinePages'

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
