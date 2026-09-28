<script setup lang="ts">
import { isGameLocale, isSiteLocale, type GameLocale } from '#shared/language'
import {
  getOfflinePages,
  saveOfflinePages,
  sendOfflineWorkerMessage,
  syncOfflinePages,
  type OfflinePage,
} from '~/composables/useOfflinePages'

definePageMeta({
  validate: (pageRoute) => isGameLocale(String(pageRoute.params.gameLocale)),
})

const route = useRoute()
const { locale, t } = useI18n()
const siteLocale = computed(() =>
  isSiteLocale(locale.value) ? locale.value : 'ja',
)
const gameLocale = computed(() => String(route.params.gameLocale))
const validGameLocale = computed<GameLocale>(() =>
  isGameLocale(gameLocale.value) ? gameLocale.value : 'jpn',
)
const selectedPages = ref<OfflinePage[]>([])
const syncing = ref(false)
const syncFailed = ref(false)
const isOffline = ref(false)
const savedSelection = ref<{
  siteLocale: string
  gameLocale: string
  pages: string[]
} | null>(null)

async function syncSelection() {
  if (syncing.value) return
  syncing.value = true
  syncFailed.value = false
  isOffline.value = !navigator.onLine

  try {
    const response = await syncOfflinePages({
      siteLocale: siteLocale.value,
      gameLocale: validGameLocale.value,
      pages: selectedPages.value,
    })
    if (!response.success) throw new Error(response.error)
    savedSelection.value = {
      siteLocale: siteLocale.value,
      gameLocale: gameLocale.value,
      pages: [...selectedPages.value],
    }
  } catch (error) {
    syncFailed.value = true
    console.warn('Holodori offline page sync failed', error)
  } finally {
    syncing.value = false
  }
}

function setPage(page: OfflinePage, enabled: boolean) {
  const pages = new Set(selectedPages.value)
  if (enabled) pages.add(page)
  else pages.delete(page)
  selectedPages.value = [...pages]
  saveOfflinePages(siteLocale.value, validGameLocale.value, selectedPages.value)
  void syncSelection()
}

onMounted(async () => {
  selectedPages.value = getOfflinePages(siteLocale.value, validGameLocale.value)
  isOffline.value = !navigator.onLine

  try {
    const status = await sendOfflineWorkerMessage<{
      selection: typeof savedSelection.value
    }>({ type: 'GET_OFFLINE_STATUS' })
    savedSelection.value = status.selection
  } catch (error) {
    console.warn('Holodori offline status unavailable', error)
  }
})
</script>

<template>
  <div class="site-shell">
    <SiteHeader />
    <main class="page-content">
      <div class="page-heading">
        <p class="eyebrow">HOLODORI DATABASE</p>
        <h1>{{ t('settings') }}</h1>
      </div>

      <section class="settings-card" aria-labelledby="offline-title">
        <h2 id="offline-title">{{ t('offlineTitle') }}</h2>
        <p class="muted">{{ t('offlineDescription') }}</p>
        <fieldset class="offline-options" :disabled="syncing">
          <legend>{{ t('offlinePages') }}</legend>
          <label>
            <input
              type="checkbox"
              :checked="selectedPages.includes('home')"
              @change="
                setPage('home', ($event.target as HTMLInputElement).checked)
              "
            />
            {{ t('home') }}
          </label>
          <label>
            <input
              type="checkbox"
              :checked="selectedPages.includes('cards')"
              @change="
                setPage('cards', ($event.target as HTMLInputElement).checked)
              "
            />
            {{ t('cards') }}
          </label>
        </fieldset>
        <p v-if="syncing" class="offline-status" role="status">
          {{ t('offlineSyncing') }}
        </p>
        <p
          v-else-if="syncFailed || isOffline"
          class="offline-status offline-error"
          role="status"
        >
          {{ t('offlineSyncFailed') }}
        </p>
        <p
          v-else-if="
            savedSelection?.siteLocale === siteLocale &&
            savedSelection?.gameLocale === gameLocale
          "
          class="offline-status"
          role="status"
        >
          {{ t('offlineSyncComplete') }}
        </p>
        <p v-else class="offline-status" role="status">
          {{ t('offlineSyncReady') }}
        </p>
      </section>
    </main>
  </div>
</template>
