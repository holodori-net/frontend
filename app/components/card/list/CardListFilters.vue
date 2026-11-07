<script setup lang="ts">
import { ArrowDownWideNarrow, ArrowUpNarrowWide, RotateCcw } from '@lucide/vue'
import type { GameLocale } from '#shared/language'
import type {
  CardListItemData,
  CardStatKey,
} from '#shared/game-data/cards/list-data'
import type {
  CardFilterOptions,
  CardListConditions,
  CardListSort,
} from '#shared/game-data/cards/list'
import type { CardSkillFilterCatalog } from '#shared/game-data/cards/skill-filter'
import type { CardConnectFilterCatalog } from '#shared/game-data/cards/connect-filter'
import type { CardSkillQueryError } from '~/composables/card/useCardListConditions'
import {
  getCardAttributeIconUrl,
  getCardStatIconUrl,
} from '#shared/game-data/cards/assets'
import { getCharacterIconUrl } from '#shared/game-data/character-list'

const props = defineProps<{
  cards: readonly CardListItemData[]
  filterOptions: CardFilterOptions
  gameLocale: GameLocale
  skillCatalog: CardSkillFilterCatalog
  connectCatalog: CardConnectFilterCatalog
  connectCounts: Record<string, number>
  visibleCardIds: string[]
  skillQuerySupported: boolean
  skillQueryError: CardSkillQueryError
}>()
const conditions = defineModel<CardListConditions>({ required: true })
const selectedSkillKeys = defineModel<string[]>('selectedSkillKeys', {
  required: true,
})
const emit = defineEmits<{ reset: [] }>()
const { t } = useI18n()
const characterOptions = computed(() => {
  const characters = new Map(
    props.cards.map((card) => [card.characterId, card]),
  )
  return props.filterOptions.character.map((id) => {
    const character = characters.get(id)
    return {
      id,
      name: character?.characterName,
      icon: getCharacterIconUrl(character?.characterAssetId ?? null),
    }
  })
})
const rarityOptions = computed(() =>
  props.filterOptions.rarity.map((value) => ({
    value,
    label: t('cardList.rarityOption', { count: value }),
  })),
)
const attributeOptions = computed(() =>
  props.filterOptions.attribute.map((value) => ({
    value,
    label: t(`cardList.attribute${value}`),
  })),
)
const specializationOptions = computed(() =>
  props.filterOptions.specialization.map((value) => ({
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
</script>

<template>
  <AccordionPanel value="filters">
    <div class="flex items-stretch">
      <AccordionHeader class="min-w-0 flex-1">{{
        t('cardList.filtersAndSort')
      }}</AccordionHeader>
      <Button
        id="card-filters-reset"
        type="button"
        severity="secondary"
        text
        class="!h-auto min-h-11 !w-14 shrink-0 rounded-none !p-0"
        :aria-label="t('cardList.reset')"
        :title="t('cardList.reset')"
        @click="emit('reset')"
      >
        <RotateCcw
          aria-hidden="true"
          :size="20"
          :stroke-width="2"
          color="currentColor"
        />
      </Button>
    </div>
    <AccordionContent>
      <div class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label class="col-span-full block min-w-0">
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
          <fieldset class="min-w-0">
            <legend class="mb-1.5 text-sm font-medium">
              {{ t('cardList.rarity') }}
            </legend>
            <div class="flex flex-wrap gap-1">
              <label
                v-for="option in rarityOptions"
                :key="option.value"
                :for="`card-rarity-${option.value}`"
                class="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <Checkbox
                  v-model="conditions.rarity"
                  :input-id="`card-rarity-${option.value}`"
                  :value="option.value"
                />
                <CardListRarity
                  :count="option.value"
                  :label="option.label"
                  show-label
                  loading-skeleton
                />
              </label>
            </div>
          </fieldset>

          <fieldset class="min-w-0">
            <legend class="mb-1.5 text-sm font-medium">
              {{ t('cardList.attribute') }}
            </legend>
            <div class="flex flex-wrap gap-1">
              <label
                v-for="option in attributeOptions"
                :key="option.value"
                :for="`card-attribute-${option.value}`"
                class="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <Checkbox
                  v-model="conditions.attribute"
                  :input-id="`card-attribute-${option.value}`"
                  :value="option.value"
                />
                <CardListIcon
                  :src="getCardAttributeIconUrl(option.value)"
                  label=""
                  loading-skeleton
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </fieldset>

          <fieldset class="min-w-0">
            <legend class="mb-1.5 text-sm font-medium">
              {{ t('cardList.specialization') }}
            </legend>
            <div class="flex flex-wrap gap-1">
              <label
                v-for="option in specializationOptions"
                :key="option.value"
                :for="`card-specialization-${option.value}`"
                class="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <Checkbox
                  v-model="conditions.specialization"
                  :input-id="`card-specialization-${option.value}`"
                  :value="option.value"
                />
                <CardListIcon
                  :src="getCardStatIconUrl(option.value)"
                  label=""
                  monochrome
                  loading-skeleton
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </fieldset>

          <label class="block min-w-0">
            <span class="mb-1.5 block text-sm font-medium">{{
              t('cardList.character')
            }}</span>
            <MemberSelect
              v-model="conditions.character"
              multiple
              class="w-full"
              :members="characterOptions"
              :aria-label="t('cardList.character')"
            />
          </label>
          <fieldset class="min-w-0">
            <legend class="mb-1.5 text-sm font-medium">
              {{ t('cardList.skills.label') }}
            </legend>
            <Message
              v-if="!skillQuerySupported"
              severity="warn"
              :closable="false"
              class="mb-2"
            >
              {{ t('cardList.skills.unsupported') }}
            </Message>
            <Message
              v-else-if="skillQueryError"
              severity="warn"
              :closable="false"
              class="mb-2"
            >
              {{ t(`cardList.skills.queryError.${skillQueryError}`) }}
            </Message>
            <CardListSkillFilter
              v-model="selectedSkillKeys"
              :catalog="skillCatalog"
              :game-locale="gameLocale"
              :visible-card-ids="visibleCardIds"
              :disabled="!skillQuerySupported"
            />
          </fieldset>
          <fieldset class="min-w-0">
            <legend class="mb-1.5 text-sm font-medium">
              {{ t('cardList.connectFilter.label') }}
            </legend>
            <CardListConnectFilter
              v-model="conditions.connect"
              :catalog="connectCatalog"
              :counts="connectCounts"
              :visible-card-count="visibleCardIds.length"
            />
          </fieldset>
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
                <div v-if="selectedSortOption" class="flex items-center gap-2">
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
            class="!size-11 !p-0"
            severity="secondary"
            outlined
            :aria-label="
              t(
                conditions.direction === 'desc'
                  ? 'cardList.descending'
                  : 'cardList.ascending',
              )
            "
            :title="
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
            <ArrowDownWideNarrow
              v-if="conditions.direction === 'desc'"
              aria-hidden="true"
              :size="20"
              :stroke-width="2"
              color="currentColor"
            />
            <ArrowUpNarrowWide
              v-else
              aria-hidden="true"
              :size="20"
              :stroke-width="2"
              color="currentColor"
            />
          </Button>
        </div>
      </div>
    </AccordionContent>
  </AccordionPanel>
</template>
