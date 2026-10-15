<script setup lang="ts">
import {
  gameLocaleLanguages,
  isGameLocale,
  resolveLocalizedName,
  type GameLocale,
} from '#shared/language'
import type {
  CardListItemData,
  CardStatKey,
} from '#shared/game-data/card-list-data'
import {
  getCardAttributeIconUrl,
  getCardStatIconUrl,
} from '#shared/game-data/card-icons'
import { getCharacterIconUrl } from '#shared/game-data/character-list'
import {
  filterAndSortCards,
  getCardFilterOptions,
  type CardListLayout,
  type CardListSort,
} from '#shared/game-data/card-list'
import { useCardListConditions } from '~/composables/useCardListConditions'
import { useCardLayout } from '~/composables/useCardLayout'

const route = useRoute()
const { t } = useI18n()
useHead(() => ({ title: `${t('cards')} | ${t('siteName')}` }))

definePageMeta({
  validate: (pageRoute) => isGameLocale(String(pageRoute.params.gameLocale)),
})

const gameLocale = computed(() => String(route.params.gameLocale) as GameLocale)
const { data: cards, error } = await useAsyncData<CardListItemData[]>(
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
if (cards.value === null || cards.value === undefined) {
  throw createError({
    statusCode: 500,
    statusMessage: 'Card data is unavailable',
    fatal: true,
  })
}

const cardItems = computed(() => cards.value!)
const filterOptions = computed(() => getCardFilterOptions(cardItems.value))
const {
  conditions,
  reset,
  ready: conditionsReady,
} = useCardListConditions(filterOptions)
const { layout, initialized: layoutInitialized } = useCardLayout()
const ready = computed(() => conditionsReady.value && layoutInitialized.value)
const visibleCards = computed(() =>
  filterAndSortCards(cardItems.value, conditions.value),
)
const characterOptions = computed(() => {
  const characters = new Map(
    cardItems.value.map((card) => [card.characterId, card]),
  )
  return filterOptions.value.character.map((id) => {
    const character = characters.get(id)
    const name = character?.characterName
    const localizedName = name
      ? resolveLocalizedName(name, gameLocale.value)
      : { text: id, lang: gameLocaleLanguages[gameLocale.value] }
    return {
      value: id,
      icon: getCharacterIconUrl(character?.characterAssetId ?? null),
      ...localizedName,
      label: localizedName.text,
    }
  })
})
const rarityOptions = computed(() =>
  filterOptions.value.rarity.map((value) => ({
    value,
    label: t('cardList.rarityOption', { count: value }),
  })),
)
const attributeOptions = computed(() =>
  filterOptions.value.attribute.map((value) => ({
    value,
    label: t(`cardList.attribute${value}`),
  })),
)
const specializationOptions = computed(() =>
  filterOptions.value.specialization.map((value) => ({
    value,
    label: t(`cardList.stat.${value}`),
  })),
)
const statKeys: CardStatKey[] = ['performance', 'technique', 'sense']
function isStatSortKey(value: CardListSort): value is CardStatKey {
  return statKeys.includes(value as CardStatKey)
}

const sortOptions = computed<{ value: CardListSort; label: string }[]>(() =>
  (
    [
      'order',
      'rarity',
      'character',
      'performance',
      'technique',
      'sense',
      'total',
    ] as const
  ).map((value) => ({ value, label: t(`cardList.sort.${value}`) })),
)
const selectedSortOption = computed(() =>
  sortOptions.value.find((option) => option.value === conditions.value.sort),
)
const layoutOptions = computed<{ value: CardListLayout; label: string }[]>(() =>
  (['full', 'vertical'] as const).map((value) => ({
    value,
    label: t(`cardList.layout.${value}`),
  })),
)
</script>

<template>
  <div class="min-h-screen">
    <SiteHeader />
    <main class="mx-auto w-[min(calc(100%-2rem),100rem)] py-8 pb-20 sm:py-12">
      <div class="mb-7">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <h1 class="mb-2 text-2xl font-bold sm:text-3xl">
              {{ t('cards') }}
            </h1>
            <p class="mb-0 text-sm text-muted-color">
              {{ t('cardList.statsDescription') }}
            </p>
          </div>
          <div v-if="ready" class="w-40 shrink-0 sm:w-52">
            <label for="card-layout" class="mb-1.5 block text-sm font-medium">
              {{ t('cardList.layoutLabel') }}
            </label>
            <Select
              v-model="layout"
              input-id="card-layout"
              class="w-full"
              :options="layoutOptions"
              option-label="label"
              option-value="value"
              :aria-label="t('cardList.layoutLabel')"
            />
          </div>
        </div>
      </div>

      <noscript>{{ t('cardList.requiresJavaScript') }}</noscript>
      <p
        v-if="!ready"
        class="py-16 text-center text-sm text-muted-color"
        role="status"
      >
        {{ t('cardList.loading') }}
      </p>

      <template v-else>
        <section
          class="mb-7 space-y-4 rounded-xl border border-surface-200 bg-surface-0 p-4 dark:border-surface-700 dark:bg-surface-900 sm:p-5"
          :aria-label="t('cardList.filters')"
        >
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label class="block min-w-0 sm:col-span-2">
              <span class="mb-1.5 block text-sm font-medium">{{
                t('cardList.search')
              }}</span>
              <InputText
                v-model="conditions.q"
                class="w-full"
                :placeholder="t('cardList.searchPlaceholder')"
                :aria-label="t('cardList.search')"
              />
            </label>
            <label class="block min-w-0">
              <span class="mb-1.5 block text-sm font-medium">{{
                t('cardList.character')
              }}</span>
              <MultiSelect
                v-model="conditions.character"
                class="w-full"
                :options="characterOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('cardList.allCharacters')"
                :aria-label="t('cardList.character')"
                filter
                display="chip"
              >
                <template #option="{ option }">
                  <div class="flex items-center gap-2">
                    <CardListIcon
                      :src="option.icon"
                      label=""
                      size="large"
                      loading-skeleton
                    />
                    <span class="game-text" :lang="option.lang">{{
                      option.text
                    }}</span>
                  </div>
                </template>
                <template #chip="{ value, removeCallback }">
                  <Chip
                    class="game-text p-multiselect-chip"
                    :label="
                      characterOptions.find((option) => option.value === value)
                        ?.text ?? value
                    "
                    :lang="
                      characterOptions.find((option) => option.value === value)
                        ?.lang
                    "
                    removable
                    @remove="removeCallback($event, value)"
                  />
                </template>
              </MultiSelect>
            </label>
            <label class="block min-w-0">
              <span class="mb-1.5 block text-sm font-medium">{{
                t('cardList.rarity')
              }}</span>
              <MultiSelect
                v-model="conditions.rarity"
                class="w-full"
                :options="rarityOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('cardList.allRarities')"
                :aria-label="t('cardList.rarity')"
                display="chip"
              >
                <template #option="{ option }">
                  <CardListRarity
                    :count="option.value"
                    :label="option.label"
                    show-label
                    loading-skeleton
                  />
                </template>
              </MultiSelect>
            </label>
            <label class="block min-w-0">
              <span class="mb-1.5 block text-sm font-medium">{{
                t('cardList.attribute')
              }}</span>
              <MultiSelect
                v-model="conditions.attribute"
                class="w-full"
                :options="attributeOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('cardList.allAttributes')"
                :aria-label="t('cardList.attribute')"
                display="chip"
              >
                <template #option="{ option }">
                  <div class="flex items-center gap-2">
                    <CardListIcon
                      :src="getCardAttributeIconUrl(option.value)"
                      label=""
                      loading-skeleton
                    />
                    <span>{{ option.label }}</span>
                  </div>
                </template>
              </MultiSelect>
            </label>
            <label class="block min-w-0">
              <span class="mb-1.5 block text-sm font-medium">{{
                t('cardList.specialization')
              }}</span>
              <MultiSelect
                v-model="conditions.specialization"
                class="w-full"
                :options="specializationOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('cardList.allSpecializations')"
                :aria-label="t('cardList.specialization')"
                display="chip"
              >
                <template #option="{ option }">
                  <div class="flex items-center gap-2">
                    <CardListIcon
                      :src="getCardStatIconUrl(option.value)"
                      label=""
                      monochrome
                      loading-skeleton
                    />
                    <span>{{ option.label }}</span>
                  </div>
                </template>
              </MultiSelect>
            </label>
          </div>

          <div class="flex flex-wrap items-end gap-3">
            <label class="min-w-48 flex-1 sm:flex-none">
              <span class="mb-1.5 block text-sm font-medium">{{
                t('cardList.sortLabel')
              }}</span>
              <Select
                v-model="conditions.sort"
                class="w-full sm:min-w-52"
                :options="sortOptions"
                option-label="label"
                option-value="value"
                :aria-label="t('cardList.sortLabel')"
              >
                <template #option="{ option }">
                  <div class="flex items-center gap-2">
                    <CardListIcon
                      v-if="isStatSortKey(option.value)"
                      :src="getCardStatIconUrl(option.value)"
                      label=""
                      monochrome
                      loading-skeleton
                    />
                    <span>{{ option.label }}</span>
                  </div>
                </template>
                <template #value="{ placeholder }">
                  <div
                    v-if="selectedSortOption"
                    class="flex items-center gap-2"
                  >
                    <CardListIcon
                      v-if="isStatSortKey(selectedSortOption.value)"
                      :src="getCardStatIconUrl(selectedSortOption.value)"
                      label=""
                      monochrome
                      loading-skeleton
                    />
                    <span>{{ selectedSortOption.label }}</span>
                  </div>
                  <span v-else>{{ placeholder }}</span>
                </template>
              </Select>
            </label>
            <Button
              type="button"
              severity="secondary"
              outlined
              :aria-label="
                t(
                  conditions.direction === 'desc'
                    ? 'cardList.descending'
                    : 'cardList.ascending',
                )
              "
              @click="
                conditions.direction =
                  conditions.direction === 'desc' ? 'asc' : 'desc'
              "
            >
              {{
                t(
                  conditions.direction === 'desc'
                    ? 'cardList.descending'
                    : 'cardList.ascending',
                )
              }}
            </Button>
            <Button type="button" severity="secondary" text @click="reset">
              {{ t('cardList.reset') }}
            </Button>
            <p class="mb-2 ml-auto text-sm text-muted-color" aria-live="polite">
              {{
                t('cardList.resultCount', {
                  visible: visibleCards.length,
                  total: cardItems.length,
                })
              }}
            </p>
          </div>
        </section>

        <p
          v-if="visibleCards.length === 0"
          class="py-16 text-center text-sm text-muted-color"
          role="status"
        >
          {{ t('cardList.noResults') }}
        </p>
        <ul
          v-else
          class="grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,350px),1fr))] gap-5 p-0"
          :aria-label="t('cards')"
        >
          <CardListItem
            v-for="card in visibleCards"
            :key="card.id"
            :card="card"
            :game-locale="gameLocale"
            :stat-keys="statKeys"
            :layout="layout"
          />
        </ul>
      </template>
    </main>
  </div>
</template>
