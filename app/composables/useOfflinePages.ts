import type { GameLocale, SiteLocale, offlinePageKinds } from '#shared/language'

export type OfflinePage = (typeof offlinePageKinds)[number]

export interface OfflineSelection {
  siteLocale: SiteLocale
  gameLocale: GameLocale
  pages: OfflinePage[]
}

export interface OfflineProgress {
  type: 'progress'
  completed: number
  total: number
  url?: string
}

const DEFAULT_PAGES: OfflinePage[] = ['home', 'cards']
const STORAGE_KEY = 'holodori-offline-pages'

function withTimeout<T>(promise: Promise<T>, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), 10_000)
    promise.then(resolve, reject).finally(() => window.clearTimeout(timeout))
  })
}

function readSelections(): Record<string, OfflinePage[]> {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? (JSON.parse(value) as Record<string, OfflinePage[]>) : {}
  } catch {
    return {}
  }
}

export function getOfflinePages(
  siteLocale: SiteLocale,
  gameLocale: GameLocale,
) {
  const key = `${siteLocale}:${gameLocale}`
  const selections = readSelections()
  return Object.hasOwn(selections, key)
    ? [...(selections[key] ?? [])]
    : [...DEFAULT_PAGES]
}

export function saveOfflinePages(
  siteLocale: SiteLocale,
  gameLocale: GameLocale,
  pages: OfflinePage[],
) {
  const selections = readSelections()
  selections[`${siteLocale}:${gameLocale}`] = [...pages]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selections))
}

export async function sendOfflineWorkerMessage<T>(
  message: Record<string, unknown>,
  onProgress?: (message: OfflineProgress) => void,
): Promise<T> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are unavailable in this browser')
  }
  const registration = await withTimeout(
    navigator.serviceWorker.getRegistration(),
    'Service worker registration is not ready',
  )
  if (!registration) throw new Error('Service worker is not registered')
  await withTimeout(
    navigator.serviceWorker.ready,
    'Service worker is not ready',
  )
  const worker = navigator.serviceWorker.controller ?? registration.active
  if (!worker) throw new Error('Offline storage is not ready')

  return new Promise<T>((resolve, reject) => {
    const channel = new MessageChannel()
    let timeout = 0
    const resetTimeout = (message: string) => {
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => {
        channel.port1.close()
        reject(new Error(message))
      }, 120_000)
    }
    resetTimeout('Offline storage did not respond')
    channel.port1.onmessage = (event: MessageEvent<T & { type?: string }>) => {
      if (event.data?.type === 'progress') {
        onProgress?.(event.data as unknown as OfflineProgress)
        resetTimeout('Offline storage stopped responding')
        return
      }
      window.clearTimeout(timeout)
      channel.port1.close()
      resolve(event.data)
    }
    try {
      worker.postMessage(message, [channel.port2])
    } catch (error) {
      window.clearTimeout(timeout)
      channel.port1.close()
      reject(error)
    }
  })
}

export function syncOfflinePages(
  selection: OfflineSelection,
  options: { onProgress?: (message: OfflineProgress) => void } = {},
) {
  return sendOfflineWorkerMessage<{
    type?: 'result'
    success: boolean
    error?: string
    siteLocale?: SiteLocale
    gameLocale?: GameLocale
    pages?: OfflinePage[]
  }>(
    {
      type: 'SYNC_OFFLINE_PAGES',
      ...selection,
      pages: [...selection.pages],
    },
    options.onProgress,
  )
}
