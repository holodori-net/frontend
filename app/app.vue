<script setup lang="ts">
import {
  buildLocalizedPath,
  getManualPreferenceConflict,
  isGameLocale,
} from '#shared/language'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const { theme } = useMemberTheme()
useHead({
  htmlAttrs: {
    'data-theme-id': computed(() => theme.value.id),
    style: computed(
      () => `--theme-motif: url("${theme.value.assets.motifMain}")`,
    ),
  },
})
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
const conflictVisible = computed({
  get: () => conflict.value !== null,
  set: (visible) => {
    if (!visible) conflict.value = null
  },
})
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
  <div class="min-h-screen">
    <VitePwaManifest />
    <NuxtPage />
    <PwaStatus />
  </div>
  <Dialog
    v-model:visible="conflictVisible"
    modal
    :closable="false"
    :header="t('languagePreferenceTitle')"
    class="w-[min(100%,28rem)]"
  >
    <p class="mb-6 leading-relaxed text-muted-color">
      {{ t('languagePreferenceDescription') }}
    </p>
    <div class="flex flex-wrap justify-end gap-3">
      <Button :label="t('usePreference')" @click="useSavedPreferences" />
      <Button
        :label="t('keepLink')"
        severity="secondary"
        @click="keepLinkedLanguages"
      />
    </div>
  </Dialog>
</template>
