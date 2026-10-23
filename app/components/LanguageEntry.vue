<script setup lang="ts">
import { NuxtLink } from '#components'
import { buildLocalizedRoute, resolveEntryLocales } from '#shared/language'

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

onMounted(async () => {
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
  <main class="grid min-h-screen place-items-center p-6">
    <section
      class="w-full max-w-xl rounded-3xl border border-surface-200 bg-surface-0 p-8 shadow-xl dark:border-surface-700 dark:bg-surface-900 sm:p-11"
    >
      <h1 class="mb-3 text-3xl font-bold">{{ t('languageEntryTitle') }}</h1>
      <p class="mb-0 leading-relaxed text-muted-color">
        {{ t('languageEntryDescription') }}
      </p>
      <Button
        :as="NuxtLink"
        class="mt-6"
        :to="continueRoute"
        :label="t('continue')"
      />
    </section>
  </main>
</template>
