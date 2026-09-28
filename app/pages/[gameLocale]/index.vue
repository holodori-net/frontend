<script setup lang="ts">
import {
  buildLocalizedPath,
  isGameLocale,
  type GameLocale,
  type SiteLocale,
} from '#shared/language'

const route = useRoute()
const { locale, t } = useI18n()
definePageMeta({
  validate: (pageRoute) => isGameLocale(String(pageRoute.params.gameLocale)),
})
const gameLocale = computed(() => String(route.params.gameLocale) as GameLocale)
</script>

<template>
  <div class="site-shell">
    <SiteHeader />
    <main class="page-content">
      <section class="hero-panel">
        <p class="eyebrow">HOLODORI DATABASE</p>
        <h1>{{ t('siteName') }}</h1>
        <p class="hero-copy">{{ t('tagline') }}</p>
        <NuxtLink
          class="button button-primary"
          :to="buildLocalizedPath(locale as SiteLocale, gameLocale, 'cards')"
        >
          {{ t('cards') }}
          <span aria-hidden="true">→</span>
        </NuxtLink>
      </section>
    </main>
  </div>
</template>
