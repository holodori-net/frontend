<script setup lang="ts">
import {
  buildLocalizedPath,
  gameLocales,
  isGameLocale,
  siteLocales,
  type GameLocale,
  type SiteLocale,
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

const activeGameLocale = computed(() => {
  const value = route.params.gameLocale
  return typeof value === 'string' && isGameLocale(value) ? value : 'jpn'
})
const pageKind = computed(() => {
  if (route.path.endsWith('/cards')) return 'cards'
  if (route.path.endsWith('/settings')) return 'settings'
  return 'home'
})

async function chooseSiteLocale(value: SiteLocale) {
  preferredSiteLocale.value = value
  await router.replace(
    buildLocalizedPath(value, activeGameLocale.value, pageKind.value),
  )
}

async function chooseGameLocale(value: GameLocale) {
  preferredGameLocale.value = value
  await router.replace(
    buildLocalizedPath(locale.value as SiteLocale, value, pageKind.value),
  )
}
</script>

<template>
  <header class="site-header">
    <NuxtLink
      class="brand"
      :to="buildLocalizedPath(locale as SiteLocale, activeGameLocale, 'home')"
    >
      <img class="brand-icon" src="/icons/icon-192.png" alt="" />
      <span>{{ t('siteName') }}</span>
    </NuxtLink>
    <nav class="main-nav" :aria-label="t('home')">
      <NuxtLink
        :to="buildLocalizedPath(locale as SiteLocale, activeGameLocale, 'home')"
        >{{ t('home') }}</NuxtLink
      >
      <NuxtLink
        :to="
          buildLocalizedPath(locale as SiteLocale, activeGameLocale, 'cards')
        "
        >{{ t('cards') }}</NuxtLink
      >
      <NuxtLink
        :to="
          buildLocalizedPath(locale as SiteLocale, activeGameLocale, 'settings')
        "
        >{{ t('settings') }}</NuxtLink
      >
    </nav>
    <div class="language-controls">
      <label>
        <span class="sr-only">{{ t('siteLanguage') }}</span>
        <select
          :value="locale"
          :aria-label="t('siteLanguage')"
          @change="
            chooseSiteLocale(
              ($event.target as HTMLSelectElement).value as SiteLocale,
            )
          "
        >
          <option v-for="value in siteLocales" :key="value" :value="value">
            {{ value }}
          </option>
        </select>
      </label>
      <label>
        <span class="sr-only">{{ t('gameLanguage') }}</span>
        <select
          :value="activeGameLocale"
          :aria-label="t('gameLanguage')"
          @change="
            chooseGameLocale(
              ($event.target as HTMLSelectElement).value as GameLocale,
            )
          "
        >
          <option v-for="value in gameLocales" :key="value" :value="value">
            {{ value }}
          </option>
        </select>
      </label>
    </div>
  </header>
</template>
