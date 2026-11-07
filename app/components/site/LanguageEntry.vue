<script setup lang="ts">
import { buildLocalizedRoute, resolveEntryLocales } from '#shared/language'
import languageEntryBootstrap from '#build/language-entry-bootstrap'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
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

const continueRoute = computed(() => buildLocalizedRoute('ja', 'jpn', route))

if (import.meta.server) {
  useHead({
    script: [{ innerHTML: languageEntryBootstrap, tagPriority: -19 }],
  })
}

onMounted(async () => {
  if (
    document.documentElement.getAttribute('data-language-entry-fallback') ===
    'failed'
  ) {
    return
  }

  const resolved = resolveEntryLocales(
    navigator.languages,
    preferredSiteLocale.value,
    preferredGameLocale.value,
  )
  await router.replace(
    buildLocalizedRoute(resolved.siteLocale, resolved.gameLocale, route),
  )
})
</script>

<template>
  <main class="language-entry-fallback p-6">
    <NuxtLink :to="continueRoute" class="underline">
      {{ t('continue') }}
    </NuxtLink>
  </main>
</template>

<style>
html[data-language-entry-fallback='hidden'] .language-entry-fallback {
  display: none;
}
</style>
