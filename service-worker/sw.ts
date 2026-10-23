/// <reference lib="webworker" />

import {
  cleanupOutdatedCaches,
  getCacheKeyForURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { googleFontsCache } from 'workbox-recipes'
import {
  isGameLocale,
  isSiteLocale,
  offlinePageKinds,
  siteLanguageMetadata,
} from '../shared/language'
import { fetchWithProgress, mapConcurrent } from './transfer'
import { pageDataPaths } from '../shared/page-data'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ revision?: string | null; url: string }>
}

const CORE_CACHE = 'holodori-core-v1'
const PAGE_CACHE_PREFIX = 'holodori-selected-pages-'
const SELECTION_URL = new URL('/__offline-selection__', self.location.origin)
const PAGE_NAMES = new Set<string>(offlinePageKinds)
const PAGE_DATA_PATHS = new Set<string>(Object.values(pageDataPaths))
const CONCURRENCY = 4
const precacheEntries = self.__WB_MANIFEST.map((entry) =>
  typeof entry === 'string' ? { url: entry } : entry,
)
const PRECACHED_URLS = new Set(
  precacheEntries.map((entry) => new URL(entry.url, self.location.origin).href),
)
const PRECACHE_ASSET_URLS = [...PRECACHED_URLS].filter((url) =>
  /^\/(?:_nuxt|_i18n)\//.test(new URL(url).pathname),
)
let selectionQueue: Promise<unknown> = Promise.resolve()

precacheAndRoute(precacheEntries)
cleanupOutdatedCaches()
googleFontsCache({
  cachePrefix: 'holodori-google-fonts',
  maxEntries: 256,
  maxAgeSeconds: 60 * 60 * 24 * 365,
})

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
  return `/${siteLocale}/${gameLocale}${page === 'home' ? '' : `/${page}`}/`
}

function payloadPath(page: string) {
  return `${page.replace(/\/$/, '')}/_payload.json`
}

function validSelection(data: Record<string, unknown>) {
  return (
    typeof data.siteLocale === 'string' &&
    isSiteLocale(data.siteLocale) &&
    typeof data.gameLocale === 'string' &&
    isGameLocale(data.gameLocale) &&
    Array.isArray(data.pages) &&
    data.pages.every((page) => typeof page === 'string' && PAGE_NAMES.has(page))
  )
}

async function currentSelection() {
  const core = await caches.open(CORE_CACHE)
  const response = await core.match(SELECTION_URL)
  return response
    ? ((await response.json()) as {
        cacheName: string
        siteLocale: string
        gameLocale: string
        pages: string[]
        assetUrls?: string[]
      })
    : null
}

async function syncSelection(
  data: Record<string, unknown>,
  port?: MessagePort,
) {
  if (!validSelection(data)) throw new Error('Invalid offline page selection')
  const siteLocale = data.siteLocale as string
  const gameLocale = data.gameLocale as string
  const pages = [...new Set(data.pages as string[])]
  const routes = [...new Set([...pages, 'settings'])].map((page) =>
    page === 'settings'
      ? `/${siteLocale}/${gameLocale}/settings/`
      : pagePath(siteLocale, gameLocale, page),
  )
  const resources = [
    ...new Set([
      ...routes.flatMap((route) => [route, payloadPath(route)]),
      ...Object.entries(pageDataPaths)
        .filter(([page]) => pages.includes(page))
        .map(([, path]) => path),
    ]),
  ]
  const stagingName = `${PAGE_CACHE_PREFIX}${siteLocale}-${gameLocale}-${crypto.randomUUID()}`
  const staging = await caches.open(stagingName)
  const total = resources.length + PRECACHE_ASSET_URLS.length
  let completed = 0
  const report = (url: string) =>
    port?.postMessage({ type: 'progress', completed, total, url })
  let committed = false

  try {
    await mapConcurrent(resources, CONCURRENCY, async (path) => {
      const request = new Request(new URL(path, self.location.origin), {
        cache: 'reload',
      })
      const response = await fetchWithProgress(request, () => report(path))
      if (!response.ok || response.type === 'opaque')
        throw new Error(`Unable to download ${path}`)
      await staging.put(request, response)
      completed += 1
      report(path)
    })

    await mapConcurrent(PRECACHE_ASSET_URLS, CONCURRENCY, async (assetUrl) => {
      const cacheKey = new URL(
        getCacheKeyForURL(assetUrl) ?? assetUrl,
        self.location.origin,
      ).href
      const response = await caches.match(cacheKey)
      if (!response || !response.ok || response.type === 'opaque')
        throw new Error(
          `Required application asset is unavailable: ${assetUrl}`,
        )
      await staging.put(assetUrl, response)
      completed += 1
      report(assetUrl)
    })

    const core = await caches.open(CORE_CACHE)
    await core.put(
      SELECTION_URL,
      new Response(
        JSON.stringify({
          cacheName: stagingName,
          siteLocale,
          gameLocale,
          pages,
          assetUrls: PRECACHE_ASSET_URLS,
        }),
      ),
    )
    committed = true
    const previous = (await caches.keys()).filter(
      (name) => name.startsWith(PAGE_CACHE_PREFIX) && name !== stagingName,
    )
    await Promise.allSettled(previous.map((name) => caches.delete(name)))
    return { type: 'result', success: true, siteLocale, gameLocale, pages }
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
          const next = selectionQueue.then(() => syncSelection(data, port))
          selectionQueue = next.catch(() => undefined)
          port?.postMessage(await next)
        } else if (data.type === 'GET_OFFLINE_STATUS') {
          const current = await currentSelection()
          const cache = current ? await caches.open(current.cacheName) : null
          const requests = cache ? await cache.keys() : []
          port?.postMessage({
            type: 'result',
            success: true,
            selection: current,
            urls: requests.map((request) => new URL(request.url).pathname),
          })
        }
      } catch (error) {
        port?.postMessage({
          type: 'result',
          success: false,
          error: error instanceof Error ? error.message : 'Offline sync failed',
        })
      }
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  const snapshotAsset =
    url.origin === self.location.origin &&
    /^\/(?:_nuxt|_i18n)\//.test(url.pathname) &&
    !PRECACHED_URLS.has(url.href)
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    (request.mode !== 'navigate' &&
      !url.pathname.endsWith('/_payload.json') &&
      !PAGE_DATA_PATHS.has(url.pathname) &&
      !snapshotAsset)
  )
    return

  event.respondWith(
    (async () => {
      try {
        return await fetch(request)
      } catch {
        const core = await caches.open(CORE_CACHE)
        const current = await currentSelection()
        const cache = current ? await caches.open(current.cacheName) : null
        if (snapshotAsset) {
          const isPinned = current?.assetUrls?.some(
            (assetUrl) => new URL(assetUrl).pathname === url.pathname,
          )
          if (!isPinned)
            return new Response('Offline application asset unavailable', {
              status: 503,
            })
          const asset = await cache?.match(url.href, { ignoreSearch: true })
          if (asset) return asset
        }
        const lookup = new URL(request.url)
        if (request.mode === 'navigate' && !lookup.pathname.endsWith('/'))
          lookup.pathname += '/'
        const cached = cache
          ? await cache.match(lookup.href, { ignoreSearch: true })
          : undefined
        if (cached) return cached
        const fallback = await core.match(request, { ignoreSearch: true })
        if (fallback) return fallback
        if (url.pathname === '/') {
          const rootPage = await core.match('/')
          if (rootPage) return rootPage
        }
        if (
          url.pathname.endsWith('/_payload.json') ||
          PAGE_DATA_PATHS.has(url.pathname)
        )
          return new Response(
            JSON.stringify({ error: 'Offline payload is not available' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            },
          )
        const requestedLocale = url.pathname.split('/')[1] ?? 'ja'
        const siteLocale = isSiteLocale(requestedLocale)
          ? requestedLocale
          : 'ja'
        const message =
          siteLocale === 'ja'
            ? 'このページはオフライン用に保存されていません。オンライン時に設定から保存してください。'
            : siteLocale === 'zh-TW'
              ? '此頁面尚未儲存供離線使用。請在連線時從設定頁下載。'
              : 'This page is not saved for offline use. Save it from Settings while online.'
        return new Response(
          `<!doctype html><html lang="${siteLanguageMetadata[siteLocale].language}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>hololive Dreams Unofficial Database</title><body><main><h1>hololive Dreams Unofficial Database</h1><p>${message}</p><a href="/" lang="en">Home</a></main></body></html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
        )
      }
    })(),
  )
})
