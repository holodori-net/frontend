<script setup lang="ts">
import {
  isGameLocale,
  resolveLocalizedName,
  type GameLocale,
} from '#shared/language'
import { formatSeoTitle } from '#shared/seo'
import { cardDetailDataPath } from '#shared/page-data'
import { getCardImageUrl } from '#shared/game-data/cards/assets'
import type { CardDetailPayload } from '#shared/game-data/cards/detail'

const route = useRoute()
const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const gameLocale = computed(() => String(route.params.gameLocale) as GameLocale)
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
const characterName = computed(() =>
  data.value
    ? resolveLocalizedName(data.value.card.characterName, gameLocale.value).text
    : '',
)
const cardTitle = computed(() =>
  characterName.value
    ? `${cardName.value} — ${characterName.value}`
    : cardName.value,
)
const description = computed(() =>
  data.value
    ? t('cardDetail.description', {
        name: cardName.value,
        character: characterName.value,
      })
    : t('cardDetail.notFoundDescription'),
)
const imageUrl = computed(() =>
  data.value
    ? getCardImageUrl(data.value.card.assetId, 'full', 'original')
    : undefined,
)
useHead(() => ({
  title: cardTitle.value,
  meta: [
    { name: 'description', content: description.value },
    { property: 'og:title', content: formatSeoTitle(cardTitle.value) },
    { property: 'og:description', content: description.value },
    { property: 'og:type', content: 'website' },
    ...(imageUrl.value
      ? [{ property: 'og:image', content: imageUrl.value }]
      : []),
  ],
}))

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
    <main class="mx-auto w-[calc(100%-2rem)] pt-4 pb-20">
      <div class="mx-auto max-w-[100rem]">
        <div v-if="data">
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
