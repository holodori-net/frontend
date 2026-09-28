/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ revision?: string | null; url: string }>
}

const CORE_CACHE = 'holodori-core-v1'
const PAGE_CACHE_PREFIX = 'holodori-selected-pages-'
const SELECTION_URL = new URL('/__offline-selection__', self.location.origin)
const SITE_LOCALES = new Set(['ja', 'en', 'zh-TW'])
const GAME_LOCALES = new Set(['jpn', 'eng', 'ind', 'kor', 'cht', 'chs'])
const PAGE_NAMES = new Set(['home', 'cards'])

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE)
      .then((cache) => cache.addAll(['/', '/_payload.json'])),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function pagePath(siteLocale: string, gameLocale: string, page: string) {
  return `/${siteLocale}/${gameLocale}${page === 'cards' ? '/cards' : ''}/`
}

function payloadPath(page: string) {
  return `${page.replace(/\/$/, '')}/_payload.json`
}

function isValidSelection(data: Record<string, unknown>) {
  return (
    typeof data.siteLocale === 'string' &&
    SITE_LOCALES.has(data.siteLocale) &&
    typeof data.gameLocale === 'string' &&
    GAME_LOCALES.has(data.gameLocale) &&
    Array.isArray(data.pages) &&
    data.pages.every(
      (page): page is string =>
        typeof page === 'string' && PAGE_NAMES.has(page),
    )
  )
}

async function syncSelection(data: Record<string, unknown>) {
  if (!isValidSelection(data)) {
    throw new Error('Invalid offline page selection')
  }

  const siteLocale = data.siteLocale as string
  const gameLocale = data.gameLocale as string
  const pages = data.pages as string[]
  const routes = [...new Set([...pages, 'settings'])].map((page) =>
    page === 'settings'
      ? `/${siteLocale}/${gameLocale}/settings/`
      : pagePath(siteLocale, gameLocale, page),
  )
  const resources = routes.flatMap((route) => [route, payloadPath(route)])
  const stagingName = `${PAGE_CACHE_PREFIX}${siteLocale}-${gameLocale}-${Date.now()}`
  const staging = await caches.open(stagingName)
  let committed = false

  try {
    const downloaded = await Promise.all(
      resources.map(async (path) => {
        const request = new Request(new URL(path, self.location.origin), {
          cache: 'reload',
        })
        const response = await fetch(request)
        if (!response.ok) throw new Error(`Unable to download ${path}`)
        return { request, response }
      }),
    )

    await Promise.all(
      downloaded.map(({ request, response }) => staging.put(request, response)),
    )

    const core = await caches.open(CORE_CACHE)
    await core.put(
      SELECTION_URL,
      new Response(
        JSON.stringify({
          cacheName: stagingName,
          siteLocale,
          gameLocale,
          pages,
        }),
      ),
    )
    committed = true

    const previousNames = (await caches.keys()).filter(
      (name) => name.startsWith(PAGE_CACHE_PREFIX) && name !== stagingName,
    )
    await Promise.allSettled(previousNames.map((name) => caches.delete(name)))
    return { success: true, siteLocale, gameLocale, pages }
  } catch (error) {
    if (!committed) await caches.delete(stagingName)
    throw error
  }
}

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as Record<string, unknown> | undefined
  const port = event.ports[0]
  if (!data || typeof data.type !== 'string') return

  if (data.type === 'SKIP_WAITING') {
    void self.skipWaiting()
    return
  }

  event.waitUntil(
    (async () => {
      try {
        if (data.type === 'SYNC_OFFLINE_PAGES') {
          const result = await syncSelection(data)
          port?.postMessage(result)
        } else if (data.type === 'GET_OFFLINE_STATUS') {
          const core = await caches.open(CORE_CACHE)
          const selection = await core.match(SELECTION_URL)
          const current = selection
            ? ((await selection.json()) as {
                cacheName: string
                siteLocale: string
                gameLocale: string
                pages: string[]
              })
            : null
          const cache = current ? await caches.open(current.cacheName) : null
          const requests = cache ? await cache.keys() : []
          port?.postMessage({
            success: true,
            selection: current,
            urls: requests.map((request) => new URL(request.url).pathname),
          })
        }
      } catch (error) {
        port?.postMessage({
          success: false,
          error: error instanceof Error ? error.message : 'Offline sync failed',
        })
      }
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (
    request.method !== 'GET' ||
    new URL(request.url).origin !== self.location.origin
  ) {
    return
  }

  const url = new URL(request.url)
  const isPayload = url.pathname.endsWith('/_payload.json')
  if (!isPayload && request.mode !== 'navigate') return

  event.respondWith(
    (async () => {
      try {
        return await fetch(request)
      } catch {
        const coreCache = await caches.open(CORE_CACHE)
        const selection = await coreCache.match(SELECTION_URL)
        const current = selection
          ? ((await selection.json()) as { cacheName: string })
          : null
        const pageCache = current ? await caches.open(current.cacheName) : null
        const cacheUrl = new URL(request.url)
        if (
          request.mode === 'navigate' &&
          cacheUrl.pathname.length > 1 &&
          !cacheUrl.pathname.endsWith('/')
        ) {
          cacheUrl.pathname = `${cacheUrl.pathname.replace(/\/+$/, '')}/`
        }
        const cached = pageCache
          ? await pageCache.match(cacheUrl.href, { ignoreSearch: true })
          : undefined
        if (cached) return cached

        const coreResponse = await coreCache.match(request, {
          ignoreSearch: true,
        })
        if (coreResponse) return coreResponse

        if (url.pathname === '/') {
          const rootPage = await coreCache.match('/')
          if (rootPage) return rootPage
        }

        if (isPayload) {
          return new Response(
            JSON.stringify({ error: 'Offline payload is not available' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            },
          )
        }

        const siteLocale = url.pathname.split('/')[1]
        const message =
          siteLocale === 'ja'
            ? 'このページはオフライン用に保存されていません。オンライン時に設定から保存してください。'
            : siteLocale === 'zh-TW'
              ? '此頁面尚未儲存供離線使用。請在連線時從設定頁下載。'
              : 'This page is not saved for offline use. Save it from Settings while online.'
        return new Response(
          `<!doctype html><html lang="${siteLocale || 'ja'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Holodori Database</title><body><main><h1>Holodori Database</h1><p>${message}</p><a href="/">Home</a></main></body></html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        )
      }
    })(),
  )
})
