import type { GameLocale, SiteLocale, offlinePageKinds } from './language'

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

export interface OfflineStatusSelection {
  cacheName: string
  siteLocale: string
  gameLocale: string
  pages: string[]
  assetUrls?: string[]
}

export type OfflineWorkerRequest =
  | ({ type: 'SYNC_OFFLINE_PAGES' } & OfflineSelection)
  | { type: 'GET_OFFLINE_STATUS' }
  | { type: 'SKIP_WAITING' }

export interface OfflineSyncSuccess {
  type: 'result'
  success: true
  siteLocale: SiteLocale
  gameLocale: GameLocale
  pages: OfflinePage[]
}

export interface OfflineStatusSuccess {
  type: 'result'
  success: true
  selection: OfflineStatusSelection | null
  urls: string[]
}

export interface OfflineWorkerFailure {
  type: 'result'
  success: false
  error: string
}

export type OfflineSyncResult = OfflineSyncSuccess | OfflineWorkerFailure
export type OfflineStatusResult = OfflineStatusSuccess | OfflineWorkerFailure
export type OfflineWorkerResponse =
  OfflineProgress | OfflineSyncResult | OfflineStatusResult

export type OfflineWorkerResult = OfflineSyncResult | OfflineStatusResult
