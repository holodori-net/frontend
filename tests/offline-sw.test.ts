import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('workbox-recipes', () => ({ googleFontsCache: vi.fn() }))

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
  async match(input: RequestInfo | URL, options?: CacheQueryOptions) {
    const key = this.key(input)
    if (options?.ignoreSearch) {
      const requested = new URL(key)
      requested.search = ''
      for (const [url, response] of this.values) {
        const candidate = new URL(url)
        candidate.search = ''
        if (candidate.href === requested.href) return response.clone()
      }
      return undefined
    }
    return this.values.get(key)?.clone()
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
    const status = await message({ type: 'GET_OFFLINE_STATUS' })
    expect(status.at(-1)).toMatchObject({
      urls: expect.arrayContaining(['/data/cards.json']),
    })
    expect((status.at(-1) as { urls: string[] }).urls).not.toContain(
      '/data/characters.json',
    )
  })

  it('downloads card details independently and includes detail pages, payloads, and data', async () => {
    const fetchResource = vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input)
      if (url.endsWith('/data/card-details.json'))
        return Response.json({ cardIds: ['card-1', 'card/2'] })
      return new Response(url)
    })
    vi.stubGlobal('fetch', fetchResource)
    const replies = await message({
      type: 'SYNC_OFFLINE_PAGES',
      siteLocale: 'ja',
      gameLocale: 'jpn',
      pages: ['cardDetails'],
    })
    expect(replies.at(-1)).toMatchObject({
      success: true,
      pages: ['cardDetails'],
    })
    const downloaded = fetchResource.mock.calls.map(
      ([request]) => (request as Request).url,
    )
    expect(downloaded).toContain('https://example.test/data/card-details.json')
    expect(downloaded).toContain('https://example.test/ja/jpn/cards/card-1/')
    expect(downloaded).toContain(
      'https://example.test/ja/jpn/cards/card-1/_payload.json',
    )
    expect(downloaded).toContain('https://example.test/data/cards/card-1.json')
    expect(downloaded).toContain('https://example.test/ja/jpn/cards/card%2F2/')
    expect(downloaded).toContain(
      'https://example.test/data/cards/card%2F2.json',
    )
    expect(downloaded).not.toContain('https://example.test/data/cards.json')
    expect(downloaded).not.toContain('https://example.test/ja/jpn/cards/')
  })

  it('downloads card list data without fetching the detail index', async () => {
    const fetchResource = vi.fn(
      async (input: RequestInfo | URL) =>
        new Response(input instanceof Request ? input.url : String(input)),
    )
    vi.stubGlobal('fetch', fetchResource)
    const replies = await message({
      type: 'SYNC_OFFLINE_PAGES',
      siteLocale: 'ja',
      gameLocale: 'jpn',
      pages: ['cards'],
    })
    expect(replies.at(-1)).toMatchObject({ success: true })
    const downloaded = fetchResource.mock.calls.map(
      ([request]) => (request as Request).url,
    )
    expect(downloaded).toContain('https://example.test/data/cards.json')
    expect(downloaded).not.toContain(
      'https://example.test/data/card-details.json',
    )
    expect(
      downloaded.some((url) => /\/data\/cards\/[^/]+\.json$/.test(url)),
    ).toBe(false)
  })

  it('downloads list and detail resources together', async () => {
    const fetchResource = vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input)
      return url.endsWith('/data/card-details.json')
        ? Response.json({ cardIds: ['card-1'] })
        : new Response(url)
    })
    vi.stubGlobal('fetch', fetchResource)
    const replies = await message({
      type: 'SYNC_OFFLINE_PAGES',
      siteLocale: 'ja',
      gameLocale: 'jpn',
      pages: ['cards', 'cardDetails'],
    })
    expect(replies.at(-1)).toMatchObject({ success: true })
    const downloaded = fetchResource.mock.calls.map(
      ([request]) => (request as Request).url,
    )
    expect(downloaded).toContain('https://example.test/data/cards.json')
    expect(downloaded).toContain('https://example.test/data/cards/card-1.json')
  })

  it.each(['characters', 'songs'])(
    'stores the %s page and payload at their localized paths',
    async (page) => {
      const fetchPage = vi.fn(
        async (request: Request) => new Response(request.url),
      )
      vi.stubGlobal('fetch', fetchPage)
      const replies = await message({
        type: 'SYNC_OFFLINE_PAGES',
        siteLocale: 'zh-TW',
        gameLocale: 'cht',
        pages: [page],
      })
      expect(replies.at(-1)).toMatchObject({
        success: true,
        pages: [page],
      })
      const downloaded = fetchPage.mock.calls.map(
        ([request]) => (request as Request).url,
      )
      expect(downloaded).toContain(`https://example.test/zh-TW/cht/${page}/`)
      expect(downloaded).toContain(
        `https://example.test/zh-TW/cht/${page}/_payload.json`,
      )
      expect(downloaded).toContain(`https://example.test/data/${page}.json`)
      expect(downloaded).not.toContain('https://example.test/data/cards.json')
    },
  )

  it.each(['/_payload.json', '/data/characters.json', '/data/songs.json'])(
    'keeps the previous selection when downloading %s fails',
    async (failedResource) => {
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
          return url.endsWith(failedResource)
            ? new Response('failure', { status: 503 })
            : new Response('page')
        }),
      )
      const replies = await message({
        type: 'SYNC_OFFLINE_PAGES',
        siteLocale: 'ja',
        gameLocale: 'jpn',
        pages: ['characters', 'songs'],
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
    },
  )

  it.each(['/data/card-details.json', '/data/cards/card-1.json'])(
    'keeps the previous snapshot when card detail download %s fails',
    async (failedResource) => {
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
          if (url.endsWith('/data/card-details.json')) {
            return url.endsWith(failedResource)
              ? new Response('failure', { status: 503 })
              : Response.json({ cardIds: ['card-1'] })
          }
          return url.endsWith(failedResource)
            ? new Response('failure', { status: 503 })
            : new Response('downloaded')
        }),
      )
      const replies = await message({
        type: 'SYNC_OFFLINE_PAGES',
        siteLocale: 'ja',
        gameLocale: 'jpn',
        pages: ['cardDetails'],
      })
      expect(replies.at(-1)).toMatchObject({ type: 'result', success: false })
      expect(await (await core.match(selectionUrl))?.json()).toMatchObject({
        cacheName: 'holodori-selected-pages-ja-jpn-old',
      })
      expect(
        [...memoryCaches.keys()].some(
          (name) =>
            name !== 'holodori-selected-pages-ja-jpn-old' &&
            name.startsWith('holodori-selected-pages-'),
        ),
      ).toBe(false)
    },
  )

  it.each(['/data/cards.json', '/data/characters.json', '/data/songs.json'])(
    'serves saved %s offline with a build query after an app update',
    async (path) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Response.json({ saved: path })),
      )
      await message({
        type: 'SYNC_OFFLINE_PAGES',
        siteLocale: 'ja',
        gameLocale: 'jpn',
        pages: ['cards', 'characters', 'songs'],
      })
      await loadWorker('/_nuxt/new.js')
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Promise.reject(new Error('offline'))),
      )
      let response: Promise<Response> | undefined
      listeners.get('fetch')!({
        request: new Request(`https://example.test${path}?_b=saved-build`),
        respondWith: (value) => (response = value),
      })
      expect(response).toBeDefined()
      await expect((await response)?.json()).resolves.toEqual({ saved: path })
    },
  )

  it('serves per-card JSON offline when the request includes a query string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input)
        return url.endsWith('/data/card-details.json')
          ? Response.json({ cardIds: ['card-1'] })
          : new Response(url)
      }),
    )
    await message({
      type: 'SYNC_OFFLINE_PAGES',
      siteLocale: 'ja',
      gameLocale: 'jpn',
      pages: ['cardDetails'],
    })
    await loadWorker('/_nuxt/new.js')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    )
    let response: Promise<Response> | undefined
    listeners.get('fetch')!({
      request: new Request(
        'https://example.test/data/cards/card-1.json?_b=saved-build',
      ),
      respondWith: (value) => (response = value),
    })
    expect(await (await response)?.text()).toBe(
      'https://example.test/data/cards/card-1.json',
    )
  })

  it('serves a saved card detail route and payload on direct navigation and reload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input)
        return url.endsWith('/data/card-details.json')
          ? Response.json({ cardIds: ['card-1'] })
          : new Response(url)
      }),
    )
    await message({
      type: 'SYNC_OFFLINE_PAGES',
      siteLocale: 'ja',
      gameLocale: 'jpn',
      pages: ['cardDetails'],
    })
    await loadWorker('/_nuxt/new.js')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    )
    const routeRequest = new Request('https://example.test/ja/jpn/cards/card-1')
    Object.defineProperty(routeRequest, 'mode', { value: 'navigate' })
    let routeResponse: Promise<Response> | undefined
    listeners.get('fetch')!({
      request: routeRequest,
      respondWith: (value) => (routeResponse = value),
    })
    expect(await (await routeResponse)?.text()).toBe(
      'https://example.test/ja/jpn/cards/card-1/',
    )

    let payloadResponse: Promise<Response> | undefined
    listeners.get('fetch')!({
      request: new Request(
        'https://example.test/ja/jpn/cards/card-1/_payload.json',
      ),
      respondWith: (value) => (payloadResponse = value),
    })
    expect(await (await payloadResponse)?.text()).toBe(
      'https://example.test/ja/jpn/cards/card-1/_payload.json',
    )
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
    expect(html).toContain('lang="zh-Hant-TW"')
    expect(html).toContain('此頁面尚未儲存供離線使用。')
    expect(html).toContain('href="/" lang="en">Home</a>')

    for (const path of [
      '/zh-TW/jpn/cards/_payload.json',
      '/data/cards.json',
      '/data/characters.json',
    ]) {
      let payloadResponse: Promise<Response> | undefined
      listeners.get('fetch')!({
        request: new Request(`https://example.test${path}`),
        respondWith: (response) => (payloadResponse = response),
      })
      const payload = await payloadResponse!
      expect(payload.status).toBe(503)
      expect(payload.headers.get('Content-Type')).toContain('application/json')
      await expect(payload.json()).resolves.toEqual({
        error: 'Offline payload is not available',
      })
    }
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
