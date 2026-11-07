<script setup lang="ts">
import { isGameLocale, type GameLocale } from '#shared/language'
import type { SongListPayload } from '#shared/game-data/songs'
import { pageDataPaths } from '#shared/page-data'

const route = useRoute()
const { t, locale } = useI18n()
const runtimeConfig = useRuntimeConfig()
const gameLocale = computed(() => String(route.params.gameLocale) as GameLocale)
definePageMeta({
  validate: (pageRoute) => isGameLocale(String(pageRoute.params.gameLocale)),
})
const {
  data: payload,
  error,
  status,
  refresh,
} = await useLazyAsyncData<SongListPayload>(
  'song-list',
  async (_nuxtApp, { signal }) => {
    try {
      if (import.meta.server) {
        const { readSongList } = await import('~~/server/data/song-list')
        return readSongList()
      }
      return await $fetch<SongListPayload>(pageDataPaths.songs, {
        signal,
        query: { _b: runtimeConfig.app.buildId },
        retry: 0,
      })
    } catch (cause) {
      if (import.meta.server) {
        console.error('Holodori song data generation failed', cause)
      }
      throw cause
    }
  },
)
if (import.meta.server && error.value) {
  throw createError({
    statusCode: 500,
    statusMessage: 'Song list data failed to load',
    cause: error.value,
  })
}
watch(error, (value) => {
  if (value) console.error('Holodori song data loading failed', value)
})
const availableAt = useState('song-list-available-at', () => Date.now())
onMounted(() => {
  availableAt.value = Date.now()
})
watch([gameLocale, locale], () => {
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
      <Suspense v-if="payload">
        <LazySongListView
          :payload="payload"
          :game-locale="gameLocale"
          :available-at="availableAt"
        />
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
