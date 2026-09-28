<script setup lang="ts">
import { NuxtLink } from '#components'
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
  <div class="min-h-screen">
    <SiteHeader />
    <main class="mx-auto w-[min(100%-3rem,67.5rem)] py-9 pb-24 sm:py-16">
      <section
        class="relative isolate overflow-hidden rounded-[1.75rem] border border-primary/20 bg-gradient-to-br from-primary/15 via-surface-0 to-surface-100 px-7 py-12 dark:via-surface-900 dark:to-surface-800 sm:px-[4.375rem] sm:py-[4.75rem]"
      >
        <div
          class="pointer-events-none absolute -right-12 -top-14 -z-10 size-64 rounded-full bg-primary/10 blur-3xl"
        />
        <p class="mb-4 text-xs font-bold tracking-[0.14em] text-primary">
          HOLODORI DATABASE
        </p>
        <h1 class="mb-4 text-4xl font-bold tracking-tight sm:text-[3.25rem]">
          {{ t('siteName') }}
        </h1>
        <p class="mb-8 max-w-2xl text-lg leading-relaxed text-muted-color">
          {{ t('tagline') }}
        </p>
        <Button
          :as="NuxtLink"
          :to="buildLocalizedPath(locale as SiteLocale, gameLocale, 'cards')"
          :label="t('cards')"
        />
      </section>
    </main>
  </div>
</template>
