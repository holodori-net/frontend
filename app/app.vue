<script setup lang="ts">
import {
  buildLocalizedPath,
  getManualPreferenceConflict,
  isGameLocale,
} from '#shared/language'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const preferredSiteLocale = useCookie<string | null>('holodori-site-locale', {
  default: () => null,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})
const preferredGameLocale = useCookie<string | null>('holodori-game-locale', {
  default: () => null,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

const conflict = ref<ReturnType<typeof getManualPreferenceConflict>>(null)
const checkedRoute = ref('')

function inspectManualPreferences() {
  const gameLocale = route.params.gameLocale
  const siteLocale = locale.value
  if (
    typeof gameLocale !== 'string' ||
    !isGameLocale(gameLocale) ||
    checkedRoute.value === route.fullPath
  ) {
    return
  }

  checkedRoute.value = route.fullPath
  conflict.value = getManualPreferenceConflict(
    siteLocale as 'ja' | 'en' | 'zh-TW',
    gameLocale,
    preferredSiteLocale.value,
    preferredGameLocale.value,
  )
}

onMounted(inspectManualPreferences)
watch(() => route.fullPath, inspectManualPreferences)

async function useSavedPreferences() {
  if (!conflict.value) return
  const destination = conflict.value
  const page = route.path.endsWith('/cards')
    ? 'cards'
    : route.path.endsWith('/settings')
      ? 'settings'
      : 'home'
  conflict.value = null
  await router.replace(
    buildLocalizedPath(destination.siteLocale, destination.gameLocale, page),
  )
}

async function keepLinkedLanguages() {
  const gameLocale = route.params.gameLocale
  if (typeof gameLocale !== 'string' || !isGameLocale(gameLocale)) return
  preferredSiteLocale.value = locale.value
  preferredGameLocale.value = gameLocale
  conflict.value = null
  window.dispatchEvent(new Event('holodori-language-confirmed'))
}
</script>

<template>
  <VitePwaManifest />
  <NuxtPage />
  <PwaStatus />
  <Teleport to="body">
    <div v-if="conflict" class="dialog-backdrop">
      <section
        aria-labelledby="language-dialog-title"
        aria-modal="true"
        class="dialog-card"
        role="dialog"
      >
        <h2 id="language-dialog-title">{{ t('languagePreferenceTitle') }}</h2>
        <p>{{ t('languagePreferenceDescription') }}</p>
        <div class="dialog-actions">
          <button class="button button-primary" @click="useSavedPreferences">
            {{ t('usePreference') }}
          </button>
          <button class="button button-secondary" @click="keepLinkedLanguages">
            {{ t('keepLink') }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
