<script setup lang="ts">
import { isGameLocale, type GameLocale } from '#shared/language'
import type { SongListPayload } from '#shared/game-data/songs'
import { pageDataPaths } from '#shared/page-data'

const route = useRoute()
const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const gameLocale = computed(() => String(route.params.gameLocale) as GameLocale)
useHead(() => ({ title: `${t('songs')} | ${t('siteName')}` }))
definePageMeta({
  validate: (pageRoute) => isGameLocale(String(pageRoute.params.gameLocale)),
})
const {
  data: payload,
  error,
  status,
  refresh,
} = useLazyAsyncData<SongListPayload>(
  'song-list',
  (_nuxtApp, { signal }) =>
    $fetch<SongListPayload>(pageDataPaths.songs, {
      signal,
      query: { _b: runtimeConfig.app.buildId },
      retry: 0,
    }),
  { server: false },
)
watch(error, (value) => {
  if (value) console.error('Holodori song data loading failed', value)
})
const availableAt = ref<number | null>(null)
onMounted(() => {
  availableAt.value = Date.now()
})
</script>

<template>
  <div class="min-h-screen">
    <SiteHeader />
    <main class="mx-auto w-[calc(100%-2rem)] py-8 pb-20 sm:py-12">
      <div class="mx-auto mb-7 w-full max-w-[100rem]">
        <h1 class="mb-2 text-2xl font-bold sm:text-3xl">{{ t('songs') }}</h1>
        <p class="mb-0 text-sm text-muted-color">
          {{ t('songList.description') }}
        </p>
      </div>
      <noscript>{{ t('songList.requiresJavaScript') }}</noscript>
      <Suspense v-if="payload && availableAt !== null">
        <LazySongListView
          :payload="payload"
          :game-locale="gameLocale"
          :available-at="availableAt"
        />
        <template #fallback
          ><p class="py-16 text-center text-sm text-muted-color" role="status">
            {{ t('pageLoading') }}
          </p></template
        >
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
