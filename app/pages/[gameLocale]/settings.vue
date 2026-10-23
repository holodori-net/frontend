<script setup lang="ts">
import {
  isGameLocale,
  isSiteLocale,
  offlinePageKinds,
  type GameLocale,
} from '#shared/language'
import {
  getOfflinePages,
  saveOfflinePages,
  sendOfflineWorkerMessage,
  syncOfflinePages,
  type OfflinePage,
} from '~/composables/useOfflinePages'

definePageMeta({
  key: (pageRoute) => pageRoute.path,
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
const transferProgress = ref<{ completed: number; total: number } | null>(null)
const syncFailed = ref(false)
const isOffline = ref(false)
const offlineSettingsReady = ref(false)
const savedSelection = ref<{
  siteLocale: string
  gameLocale: string
  pages: string[]
} | null>(null)
const updateOfflineStatus = () => {
  isOffline.value = !navigator.onLine
}

async function syncSelection() {
  if (syncing.value) return
  syncing.value = true
  syncFailed.value = false
  isOffline.value = !navigator.onLine

  try {
    const response = await syncOfflinePages(
      {
        siteLocale: siteLocale.value,
        gameLocale: validGameLocale.value,
        pages: selectedPages.value,
      },
      {
        onProgress: (progress) => {
          transferProgress.value = {
            completed: progress.completed,
            total: progress.total,
          }
        },
      },
    )
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
    transferProgress.value = null
  }
}

watch(
  selectedPages,
  (pages) => {
    saveOfflinePages(siteLocale.value, validGameLocale.value, pages)
    if (offlineSettingsReady.value) void syncSelection()
  },
  { deep: true },
)

onMounted(async () => {
  window.addEventListener('online', updateOfflineStatus)
  window.addEventListener('offline', updateOfflineStatus)
  selectedPages.value = getOfflinePages(siteLocale.value, validGameLocale.value)
  updateOfflineStatus()

  try {
    const status = await sendOfflineWorkerMessage<{
      selection: typeof savedSelection.value
    }>({ type: 'GET_OFFLINE_STATUS' })
    savedSelection.value = status.selection
  } catch (error) {
    console.warn('Holodori offline status unavailable', error)
  } finally {
    offlineSettingsReady.value = true
  }
})

onUnmounted(() => {
  window.removeEventListener('online', updateOfflineStatus)
  window.removeEventListener('offline', updateOfflineStatus)
})
</script>

<template>
  <div class="site-shell">
    <SiteHeader />
    <main class="mx-auto w-[min(100%-3rem,67.5rem)] py-9 pb-24 sm:py-16">
      <div class="mb-8">
        <p class="mb-2 text-xs font-bold tracking-[0.14em] text-primary">
          {{ t('siteName') }}
        </p>
        <h1 class="mb-0 text-3xl font-bold sm:text-4xl">
          {{ t('settings') }}
        </h1>
      </div>

      <section
        class="rounded-3xl border border-surface-200 bg-surface-0 p-6 dark:border-surface-700 dark:bg-surface-900 sm:p-8"
        aria-labelledby="offline-title"
      >
        <h2 id="offline-title" class="mb-2 text-xl font-semibold">
          {{ t('offlineTitle') }}
        </h2>
        <p class="mb-0 leading-relaxed text-muted-color">
          {{ t('offlineDescription') }}
        </p>
        <fieldset
          class="mt-6 flex flex-wrap gap-x-6 gap-y-4 border-t border-surface-200 pt-5 dark:border-surface-700"
          :disabled="syncing"
        >
          <legend class="px-3 text-sm font-semibold text-muted-color">
            {{ t('offlinePages') }}
          </legend>
          <label
            v-for="page in offlinePageKinds"
            :key="page"
            class="inline-flex cursor-pointer items-center gap-2"
          >
            <Checkbox
              v-model="selectedPages"
              :input-id="`offline-${page}`"
              :value="page"
            />
            {{ t(page) }}
          </label>
        </fieldset>
        <p v-if="syncing" class="mt-4 text-sm text-primary" role="status">
          {{ t('offlineSyncing') }}
          <span v-if="transferProgress">
            {{ transferProgress.completed }} / {{ transferProgress.total }}
          </span>
        </p>
        <p
          v-else-if="syncFailed || isOffline"
          class="offline-error mt-4 text-sm"
          role="status"
        >
          {{ t('offlineSyncFailed') }}
        </p>
        <p
          v-else-if="
            savedSelection?.siteLocale === siteLocale &&
            savedSelection?.gameLocale === gameLocale
          "
          class="mt-4 text-sm text-primary"
          role="status"
        >
          {{ t('offlineSyncComplete') }}
        </p>
        <p v-else class="mt-4 text-sm text-muted-color" role="status">
          {{ t('offlineSyncReady') }}
        </p>
      </section>
    </main>
  </div>
</template>
