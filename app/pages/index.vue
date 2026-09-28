<script setup lang="ts">
import { buildLocalizedPath, resolveEntryLocales } from '#shared/language'

defineI18nRoute(false)

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
onMounted(async () => {
  const resolved = resolveEntryLocales(
    navigator.languages,
    preferredSiteLocale.value,
    preferredGameLocale.value,
  )
  await router.replace(
    buildLocalizedPath(resolved.siteLocale, resolved.gameLocale, 'home'),
  )
})
</script>

<template>
  <main class="entry-page">
    <section class="entry-card">
      <p class="eyebrow">HOLODORI DATABASE</p>
      <h1>{{ t('languageEntryTitle') }}</h1>
      <p class="muted">{{ t('languageEntryDescription') }}</p>
      <NuxtLink class="button button-primary" to="/ja/jpn">
        {{ t('continue') }}
      </NuxtLink>
    </section>
  </main>
</template>
