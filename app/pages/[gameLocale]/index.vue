<script setup lang="ts">
import { ArrowRight, Music, PanelsTopLeft, UsersRound } from '@lucide/vue'
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
const portalPages = [
  { page: 'cards', icon: PanelsTopLeft },
  { page: 'songs', icon: Music },
  { page: 'characters', icon: UsersRound },
] as const
</script>

<template>
  <div class="min-h-screen">
    <SiteHeader />
    <main
      class="mx-auto w-[min(100%-2rem,67.5rem)] py-8 pb-12 sm:w-[min(100%-3rem,67.5rem)] sm:py-12"
    >
      <section class="px-4 py-6 text-center sm:py-8">
        <h1 class="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
          {{ t('siteName') }}
        </h1>
        <p
          class="mx-auto mb-0 max-w-2xl text-base leading-relaxed text-muted-color sm:text-lg"
        >
          {{ t('homePage.description') }}
        </p>
      </section>

      <nav
        class="mt-6 grid gap-4 sm:grid-cols-2"
        :aria-label="t('homePage.explore')"
      >
        <NuxtLink
          v-for="{ page, icon } in portalPages"
          :key="page"
          class="group flex min-h-36 items-center gap-4 rounded-2xl border border-surface-200 bg-surface-0 p-5 text-color transition-colors hover:border-primary/60 hover:bg-surface-50 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 motion-reduce:transition-none dark:border-surface-700 dark:bg-surface-900 dark:hover:bg-surface-800 dark:focus-visible:ring-offset-surface-900 sm:p-6"
          :to="buildLocalizedPath(locale as SiteLocale, gameLocale, page)"
        >
          <span
            class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <component
              :is="icon"
              aria-hidden="true"
              :size="20"
              :stroke-width="2"
              color="currentColor"
            />
          </span>
          <span class="min-w-0 flex-1">
            <span class="mb-1 block text-lg font-semibold">{{ t(page) }}</span>
            <span class="block text-sm leading-relaxed text-muted-color">{{
              t(`homePage.${page}`)
            }}</span>
          </span>
          <ArrowRight
            aria-hidden="true"
            class="shrink-0 text-muted-color transition-transform group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none"
            :size="20"
            :stroke-width="2"
            color="currentColor"
          />
        </NuxtLink>
      </nav>
    </main>
  </div>
</template>
