<script setup lang="ts">
import {
  buildLocalizedPath,
  buildLocalizedRoute,
  buildCardDetailPath,
  isGameLocale,
  resolveLocalizedName,
  type GameLocale,
  type SiteLocale,
} from '#shared/language'
import { cardDetailDataPath } from '#shared/page-data'
import { getCardImageUrl } from '#shared/game-data/card-list'
import type { CardDetailPayload } from '#shared/game-data/card-detail'
import { onBeforeRouteLeave } from 'vue-router'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const runtimeConfig = useRuntimeConfig()
const gameLocale = computed(() => String(route.params.gameLocale) as GameLocale)
const siteLocale = computed(() => String(locale.value) as SiteLocale)
const cardId = computed(() => String(route.params.id))
definePageMeta({
  validate: (pageRoute) => isGameLocale(String(pageRoute.params.gameLocale)),
})

const { data, error, status, refresh } =
  await useLazyAsyncData<CardDetailPayload | null>(
    () => `card-detail:${cardId.value}`,
    async (_nuxtApp, { signal }) => {
      try {
        if (import.meta.server) {
          const { readCardDetail } = await import('~~/server/data/card-detail')
          return await readCardDetail(cardId.value)
        }
        return await $fetch<CardDetailPayload>(
          cardDetailDataPath(cardId.value),
          {
            signal,
            query: { _b: runtimeConfig.app.buildId },
            retry: 0,
          },
        )
      } catch (cause) {
        console.error('Holodori card detail loading failed', {
          cardId: cardId.value,
          gameLocale: gameLocale.value,
          cause,
        })
        if (import.meta.server) {
          throw createError({
            statusCode: 500,
            statusMessage: 'Card detail data failed to load',
            cause,
          })
        }
        throw cause
      }
    },
    { default: () => null },
  )

if (import.meta.server) {
  if (error.value) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Card detail data failed to load',
      cause: error.value,
    })
  }
  if (status.value === 'success' && !data.value) setResponseStatus(404)
}

const cardName = computed(() =>
  data.value
    ? resolveLocalizedName(data.value.card.name, gameLocale.value).text
    : t('cardDetails'),
)
const description = computed(() =>
  data.value
    ? t('cardDetail.description', { name: cardName.value })
    : t('cardDetail.notFoundDescription'),
)
const canonicalUrl = computed(
  () =>
    new URL(
      `${buildCardDetailPath(siteLocale.value, gameLocale.value, cardId.value)}/`,
      runtimeConfig.public.siteUrl,
    ).href,
)
const imageUrl = computed(() =>
  data.value
    ? getCardImageUrl(data.value.card.assetId, 'full', 'original')
    : undefined,
)
useHead(() => ({
  title: `${cardName.value} | ${t('siteName')}`,
  meta: [
    { name: 'description', content: description.value },
    { property: 'og:title', content: `${cardName.value} | ${t('siteName')}` },
    { property: 'og:description', content: description.value },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonicalUrl.value },
    ...(imageUrl.value
      ? [{ property: 'og:image', content: imageUrl.value }]
      : []),
  ],
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
}))

const savedListPath = useState<{ cardId: string; path: string } | null>(
  'card-detail-list-location',
  () => null,
)
onMounted(() => {
  const saved = window.history.state?.cardListFullPath
  if (typeof saved === 'string') {
    savedListPath.value = { cardId: cardId.value, path: saved }
  }
})
onBeforeRouteLeave((to) => {
  if (String(to.params.id) !== cardId.value) savedListPath.value = null
})
const listLocation = computed(() => {
  const resolved =
    savedListPath.value?.cardId === cardId.value
      ? router.resolve(savedListPath.value.path)
      : null
  return buildLocalizedRoute(
    siteLocale.value,
    gameLocale.value,
    resolved ?? {
      path: buildLocalizedPath(siteLocale.value, gameLocale.value, 'cards'),
      query: {},
      hash: '',
    },
  )
})
const isNotFound = computed(
  () =>
    (!data.value && status.value === 'success') ||
    (error.value as { statusCode?: number } | null)?.statusCode === 404,
)
watch(
  isNotFound,
  (missing) => {
    if (missing && import.meta.server) setResponseStatus(404)
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-screen">
    <SiteHeader />
    <main class="mx-auto w-[calc(100%-2rem)] py-8 pb-20 sm:py-12">
      <div class="mx-auto max-w-[100rem]">
        <NuxtLink
          :to="listLocation"
          class="mb-6 inline-flex min-h-11 items-center rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >{{ t('cardDetail.backToList') }}</NuxtLink
        >
        <div v-if="data" class="space-y-8">
          <noscript>{{ t('cardDetail.requiresJavaScript') }}</noscript>
          <CardDetailView :payload="data" :game-locale="gameLocale" />
        </div>
        <section v-else-if="isNotFound" class="py-16 text-center" role="alert">
          <h1 class="mb-2 text-2xl font-bold">
            {{ t('cardDetail.notFound') }}
          </h1>
          <p class="mb-0 text-sm text-muted-color">
            {{ t('cardDetail.notFoundDescription') }}
          </p>
        </section>
        <section
          v-else-if="status === 'error'"
          class="py-16 text-center"
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
      </div>
    </main>
  </div>
</template>
