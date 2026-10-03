import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('workbox-precaching', () => ({
  cleanupOutdatedCaches: vi.fn(),
  getCacheKeyForURL: (url: string) => url,
  precacheAndRoute: vi.fn(),
}))

class MemoryCache {
  values = new Map<string, Response>()
  private key(input: RequestInfo | URL) {
    return input instanceof Request ? input.url : String(input)
  }
  async match(input: RequestInfo | URL) {
    return this.values.get(this.key(input))?.clone()
  }
  async put(input: RequestInfo | URL, response: Response) {
    this.values.set(this.key(input), response.clone())
  }
  async delete(input: RequestInfo | URL) {
    return this.values.delete(this.key(input))
  }
  async addAll() {}
  async keys() {
    return [...this.values.keys()].map((url) => new Request(url))
  }
}

const memoryCaches = new Map<string, MemoryCache>()
type TestEvent = {
  data?: Record<string, unknown>
  ports?: Array<{ postMessage: (message: unknown) => void }>
  waitUntil?: (promise: Promise<unknown>) => void
  request?: Request
  respondWith?: (response: Promise<Response>) => void
}
const listeners = new Map<string, (event: TestEvent) => void>()
describe('offline service worker selection', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  async function loadWorker(assetPath: string) {
    vi.resetModules()
    listeners.clear()
    vi.stubGlobal('self', {
      location: { origin: 'https://example.test' },
      __WB_MANIFEST: [{ url: assetPath }],
      clients: { claim: async () => {} },
      addEventListener: (type: string, listener: (event: TestEvent) => void) =>
        listeners.set(type, listener),
      skipWaiting: async () => {},
    })
    const precache = await caches.open('workbox-precache-v2')
    await precache.put(
      `https://example.test${assetPath}`,
      new Response(assetPath === '/_nuxt/app.js' ? 'app' : 'new app'),
    )
    await import('../service-worker/sw')
  }

  beforeEach(async () => {
    vi.stubGlobal('navigator', {})
    memoryCaches.clear()
    listeners.clear()
    vi.stubGlobal('caches', {
      open: async (name: string) => {
        let cache = memoryCaches.get(name)
        if (!cache) memoryCaches.set(name, (cache = new MemoryCache()))
        return cache
      },
      keys: async () => [...memoryCaches.keys()],
      match: async (input: RequestInfo | URL) => {
        for (const cache of memoryCaches.values()) {
          const response = await cache.match(input)
          if (response) return response
        }
        return undefined
      },
      delete: async (name: string) => memoryCaches.delete(name),
    })
    await loadWorker('/_nuxt/app.js')
  })

  async function message(data: Record<string, unknown>) {
    const replies: unknown[] = []
    let pending: Promise<unknown> | undefined
    listeners.get('message')!({
      data,
      ports: [{ postMessage: (value) => replies.push(value) }],
      waitUntil: (promise) => (pending = promise),
    })
    await pending
    return replies
  }

  it('downloads generic pages and emits progress before its final result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('page')),
    )
    const replies = await message({
      type: 'SYNC_OFFLINE_PAGES',
      siteLocale: 'ja',
      gameLocale: 'jpn',
      pages: ['home', 'cards'],
    })
    expect(
      replies.some((reply) => (reply as { type?: string }).type === 'progress'),
    ).toBe(true)
    expect(replies.at(-1)).toMatchObject({ type: 'result', success: true })
  })

  it('keeps the previous selection when a staged page fails', async () => {
    const core = await caches.open('holodori-core-v1')
    const selectionUrl = 'https://example.test/__offline-selection__'
    await core.put(
      selectionUrl,
      new Response(
        JSON.stringify({
          cacheName: 'holodori-selected-pages-ja-jpn-old',
          siteLocale: 'ja',
          gameLocale: 'jpn',
          pages: ['home'],
        }),
      ),
    )
    await caches.open('holodori-selected-pages-ja-jpn-old')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input)
        return url.endsWith('/_payload.json')
          ? new Response('failure', { status: 503 })
          : new Response('page')
      }),
    )
    const replies = await message({
      type: 'SYNC_OFFLINE_PAGES',
      siteLocale: 'ja',
      gameLocale: 'jpn',
      pages: ['home'],
    })
    expect(replies.at(-1)).toMatchObject({ type: 'result', success: false })
    expect(await (await core.match(selectionUrl))?.json()).toMatchObject({
      cacheName: 'holodori-selected-pages-ja-jpn-old',
    })
    expect(
      [...memoryCaches.keys()].some(
        (name) =>
          /holodori-selected-pages-ja-jpn-/.test(name) &&
          name !== 'holodori-selected-pages-ja-jpn-old',
      ),
    ).toBe(false)
  })

  it('pins required application assets in the selected page snapshot', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('page')),
    )
    await message({
      type: 'SYNC_OFFLINE_PAGES',
      siteLocale: 'ja',
      gameLocale: 'jpn',
      pages: ['home'],
    })
    const selection = await (
      await (
        await caches.open('holodori-core-v1')
      ).match('https://example.test/__offline-selection__')
    )?.json()
    const cache = await caches.open(selection.cacheName)
    expect(
      await (await cache.match('https://example.test/_nuxt/app.js'))?.text(),
    ).toBe('app')
    expect(selection.assetUrls).toEqual(['https://example.test/_nuxt/app.js'])
  })

  it('serves pinned assets referenced by a saved page after an app update', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('page')),
    )
    await message({
      type: 'SYNC_OFFLINE_PAGES',
      siteLocale: 'ja',
      gameLocale: 'jpn',
      pages: ['home'],
    })
    await loadWorker('/_nuxt/new.js')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    )
    let response: Promise<Response> | undefined
    listeners.get('fetch')!({
      request: new Request('https://example.test/_nuxt/app.js'),
      respondWith: (value) => (response = value),
    })
    expect(await (await response)?.text()).toBe('app')
  })

  it('returns a localized HTML fallback for missing pages and JSON for payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    )
    const navigation = new Request(
      'https://example.test/zh-TW/jpn/cards/',
    ) as Request & { mode: RequestMode }
    Object.defineProperty(navigation, 'mode', { value: 'navigate' })
    let pageResponse: Promise<Response> | undefined
    listeners.get('fetch')!({
      request: navigation,
      respondWith: (response) => (pageResponse = response),
    })
    const page = await pageResponse!
    const html = await page.text()
    expect(page.status).toBe(200)
    expect(page.headers.get('Content-Type')).toContain('text/html')
    expect(html).toContain('lang="zh-TW"')
    expect(html).toContain('此頁面尚未儲存供離線使用。')
    expect(html).toContain('href="/">Home</a>')

    let payloadResponse: Promise<Response> | undefined
    listeners.get('fetch')!({
      request: new Request(
        'https://example.test/zh-TW/jpn/cards/_payload.json',
      ),
      respondWith: (response) => (payloadResponse = response),
    })
    const payload = await payloadResponse!
    expect(payload.status).toBe(503)
    expect(payload.headers.get('Content-Type')).toContain('application/json')
    await expect(payload.json()).resolves.toEqual({
      error: 'Offline payload is not available',
    })
  })

  it('preserves the active cache when a same-locale retry fails in the same millisecond', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('page')),
    )
    await message({
      type: 'SYNC_OFFLINE_PAGES',
      siteLocale: 'ja',
      gameLocale: 'jpn',
      pages: ['home'],
    })
    const core = await caches.open('holodori-core-v1')
    const selectionUrl = 'https://example.test/__offline-selection__'
    const active = await (await core.match(selectionUrl))?.json()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('failure', { status: 503 })),
    )
    const replies = await message({
      type: 'SYNC_OFFLINE_PAGES',
      siteLocale: 'ja',
      gameLocale: 'jpn',
      pages: ['home'],
    })
    expect(replies.at(-1)).toMatchObject({ success: false })
    expect(await (await core.match(selectionUrl))?.json()).toEqual(active)
    expect(memoryCaches.has(active.cacheName)).toBe(true)
  })

  it('serializes concurrent selection replacements', async () => {
    const activeLocales = new Map<string, number>()
    let overlap = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input)
        const locale = url.includes('/eng/') ? 'eng' : 'jpn'
        if ([...activeLocales.keys()].some((active) => active !== locale))
          overlap = true
        activeLocales.set(locale, (activeLocales.get(locale) ?? 0) + 1)
        await new Promise((resolve) => setTimeout(resolve, 1))
        const remaining = activeLocales.get(locale)! - 1
        if (remaining) activeLocales.set(locale, remaining)
        else activeLocales.delete(locale)
        return new Response('page')
      }),
    )
    const dispatch = (gameLocale: string) => {
      let pending: Promise<unknown> | undefined
      listeners.get('message')!({
        data: {
          type: 'SYNC_OFFLINE_PAGES',
          siteLocale: 'ja',
          gameLocale,
          pages: ['home'],
        },
        ports: [{ postMessage() {} }],
        waitUntil: (promise) => (pending = promise),
      })
      return () => pending
    }
    const first = dispatch('jpn')()
    const second = dispatch('eng')()
    await first
    await second
    expect(overlap).toBe(false)
  })
})
