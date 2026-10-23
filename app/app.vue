<script setup lang="ts">
import {
  buildLocalizedRoute,
  getManualPreferenceConflict,
  isGameLocale,
  siteLocaleLanguages,
  type SiteLocale,
} from '#shared/language'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const { theme, initialized } = useMemberTheme()
useHead(() => ({
  title: t('siteName'),
  meta: [{ name: 'description', content: t('homePage.description') }],
  htmlAttrs: {
    lang: siteLocaleLanguages[locale.value as SiteLocale],
  },
}))
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
    siteLocale as SiteLocale,
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
  conflict.value = null
  await router.replace(
    buildLocalizedRoute(destination.siteLocale, destination.gameLocale, route),
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
  <svg
    v-if="initialized"
    class="member-theme-background"
    aria-hidden="true"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern
        id="member-theme-motif-pattern"
        width="80"
        height="80"
        patternUnits="userSpaceOnUse"
      >
        <image
          v-if="theme.assets.motifMain"
          :href="theme.assets.motifMain"
          x="6"
          y="6"
          width="28"
          height="28"
        />
        <image
          v-if="theme.assets.motifLight"
          :href="theme.assets.motifLight"
          x="46"
          y="46"
          width="28"
          height="28"
        />
      </pattern>
      <mask
        id="member-theme-motif-mask"
        maskContentUnits="userSpaceOnUse"
        mask-type="alpha"
      >
        <rect
          width="100%"
          height="100%"
          fill="url(#member-theme-motif-pattern)"
        />
      </mask>
    </defs>
    <rect
      width="100%"
      height="100%"
      fill="var(--member-motif-color)"
      mask="url(#member-theme-motif-mask)"
    />
  </svg>
  <div class="min-h-screen">
    <VitePwaManifest />
    <NuxtPage />
    <PwaStatus />
  </div>
  <Dialog
    v-model:visible="conflictVisible"
    modal
    dismissable-mask
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
