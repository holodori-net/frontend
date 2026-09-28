import type { GameLocale, SiteLocale } from '#shared/language'

export type OfflinePage = 'home' | 'cards'

export interface OfflineSelection {
  siteLocale: SiteLocale
  gameLocale: GameLocale
  pages: OfflinePage[]
}

const DEFAULT_PAGES: OfflinePage[] = ['home', 'cards']
const STORAGE_KEY = 'holodori-offline-pages'

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
  const saved = selections[key]
  return Object.hasOwn(selections, key)
    ? [...(saved ?? [])]
    : [...DEFAULT_PAGES]
}

export function saveOfflinePages(
  siteLocale: SiteLocale,
  gameLocale: GameLocale,
  pages: OfflinePage[],
) {
  const selections = readSelections()
  selections[`${siteLocale}:${gameLocale}`] = pages
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selections))
}

export async function sendOfflineWorkerMessage<T>(
  message: Record<string, unknown>,
): Promise<T> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are unavailable in this browser')
  }

  const registration = await navigator.serviceWorker.ready
  const worker = navigator.serviceWorker.controller ?? registration.active
  if (!worker) throw new Error('Offline storage is not ready')

  return new Promise<T>((resolve, reject) => {
    const channel = new MessageChannel()
    const timeout = window.setTimeout(() => {
      channel.port1.close()
      reject(new Error('Offline storage did not respond'))
    }, 60_000)

    channel.port1.onmessage = (event: MessageEvent<T>) => {
      window.clearTimeout(timeout)
      channel.port1.close()
      resolve(event.data)
    }
    worker.postMessage(message, [channel.port2])
  })
}

export async function syncOfflinePages(selection: OfflineSelection) {
  return sendOfflineWorkerMessage<{
    success: boolean
    error?: string
    siteLocale?: SiteLocale
    gameLocale?: GameLocale
    pages?: OfflinePage[]
  }>({ type: 'SYNC_OFFLINE_PAGES', ...selection })
}
