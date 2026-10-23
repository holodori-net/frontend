<script setup lang="ts">
import { isGameLocale, type GameLocale } from '#shared/language'
import type { CardListPayload } from '#shared/game-data/card-list-data'
import { pageDataPaths } from '#shared/page-data'

const route = useRoute()
const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const gameLocale = computed(() => String(route.params.gameLocale) as GameLocale)
useHead(() => ({ title: `${t('cards')} | ${t('siteName')}` }))

definePageMeta({
  validate: (pageRoute) => isGameLocale(String(pageRoute.params.gameLocale)),
})

const {
  data: payload,
  error,
  status,
  refresh,
} = useLazyAsyncData<CardListPayload>(
  'card-list',
  (_nuxtApp, { signal }) =>
    $fetch<CardListPayload>(pageDataPaths.cards, {
      signal,
      query: { _b: runtimeConfig.app.buildId },
      retry: 0,
    }),
  { server: false },
)
watch(error, (value) => {
  if (value) console.error('Holodori card data loading failed', value)
})
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
      <Suspense v-if="payload">
        <LazyCardListView :payload="payload" :game-locale="gameLocale" />
        <template #fallback>
          <p class="py-16 text-center text-sm text-muted-color" role="status">
            {{ t('pageLoading') }}
          </p>
        </template>
      </Suspense>
      <section
        v-else-if="status === 'error'"
        class="mx-auto w-full max-w-[100rem] py-16 text-center"
        role="alert"
      >
        <p class="mb-4 text-sm text-muted-color">{{ t('pageLoadFailed') }}</p>
        <Button type="button" :label="t('retry')" @click="refresh()" />
      </section>
      <p
        v-else
        class="py-16 text-center text-sm text-muted-color"
        role="status"
      >
        {{ t('pageLoading') }}
      </p>
    </main>
  </div>
</template>
