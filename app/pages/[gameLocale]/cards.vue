<script setup lang="ts">
import { isGameLocale, type GameLocale } from '#shared/language'
import type { CardListPayload } from '#shared/game-data/card-list-data'

const route = useRoute()
const { t } = useI18n()
useHead(() => ({ title: `${t('cards')} | ${t('siteName')}` }))

definePageMeta({
  validate: (pageRoute) => isGameLocale(String(pageRoute.params.gameLocale)),
})

const gameLocale = computed(() => String(route.params.gameLocale) as GameLocale)
const { data: payload, error } = await useAsyncData<CardListPayload>(
  'card-list',
  async () => {
    if (import.meta.server) {
      const { readCardList } = await import('~~/server/data/card-list')
      return readCardList()
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Card data is unavailable',
      fatal: true,
    })
  },
)
if (error.value) throw error.value
if (payload.value === null || payload.value === undefined) {
  throw createError({
    statusCode: 500,
    statusMessage: 'Card data is unavailable',
    fatal: true,
  })
}
</script>

<template>
  <div class="min-h-screen">
    <SiteHeader />
    <main class="mx-auto w-[calc(100%-2rem)] py-8 pb-20 sm:py-12">
      <div class="mx-auto mb-7 w-full max-w-[100rem]">
        <h1 class="mb-2 text-2xl font-bold sm:text-3xl">
          {{ t('cards') }}
        </h1>
        <p class="mb-0 text-sm text-muted-color">
          {{ t('cardList.statsDescription') }}
        </p>
      </div>

      <noscript>{{ t('cardList.requiresJavaScript') }}</noscript>
      <CardListView
        v-if="payload"
        :payload="payload"
        :game-locale="gameLocale"
      />
    </main>
  </div>
</template>
