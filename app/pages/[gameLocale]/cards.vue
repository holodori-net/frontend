<script setup lang="ts">
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  LayoutList,
  RotateCcw,
  SquareText,
} from '@lucide/vue'
import {
  gameLocaleLanguages,
  isGameLocale,
  resolveLocalizedName,
  type GameLocale,
} from '#shared/language'
import type {
  CardListPayload,
  CardStatKey,
} from '#shared/game-data/card-list-data'
import { buildCardSkillFilterCatalog } from '#shared/game-data/card-skill-filter'
import {
  buildCardConnectFilterCatalog,
  countCardConnectOptions,
} from '#shared/game-data/card-connect-filter'
import {
  getCardAttributeIconUrl,
  getCardStatIconUrl,
} from '#shared/game-data/card-icons'
import { getCharacterIconUrl } from '#shared/game-data/character-list'
import {
  filterAndSortCards,
  getCardFilterOptions,
  getCardSkillAvailableLevels,
  getCardListFieldGroups,
  CARD_BASIC_INFORMATION_FIELDS,
  CARD_SKILL_FIELDS,
  CARD_LIST_FIELDS,
  type CardListField,
  type CardListFieldGroup,
  type CardSkillField,
  type CardListLayout,
  type CardListSort,
} from '#shared/game-data/card-list'
import { useCardListConditions } from '~/composables/useCardListConditions'
import { useCardLayout } from '~/composables/useCardLayout'
import { useCardFields } from '~/composables/useCardFields'
import { useCardDeferredContent } from '~/composables/useCardDeferredContent'

const route = useRoute()
const { t, locale } = useI18n()
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

const cardItems = computed(() => payload.value!.cards)
const costumes = computed(() => payload.value!.costumes)
const skills = computed(() => payload.value!.skills)
const connectEffects = computed(() => payload.value!.connectEffects)
const connectExtents = computed(() => payload.value!.connectExtents)
const searchTextByCardId = computed(() => payload.value!.searchTextByCardId)
const skillCatalog = buildCardSkillFilterCatalog(payload.value)
const connectCatalog = buildCardConnectFilterCatalog(payload.value)
const skillKeys = Object.keys(skillCatalog.canonicalKeys)
const filterOptions = computed(() =>
  getCardFilterOptions(
    cardItems.value,
    skillKeys,
    connectCatalog.options.map(({ key }) => key),
  ),
)
const {
  conditions,
  reset: resetConditions,
  ready: conditionsReady,
  skillQuerySupported,
  skillQueryError,
} = useCardListConditions(filterOptions)
const selectedSkillKeys = computed({
  get: () => [
    ...new Set(
      conditions.value.skill.map(
        (key) => skillCatalog.canonicalKeys[key] ?? key,
      ),
    ),
  ],
  set: (keys: string[]) => {
    conditions.value.skill = [
      ...new Set(keys.map((key) => skillCatalog.canonicalKeys[key] ?? key)),
    ]
  },
})
const {
  layout,
  reset: resetLayout,
  initialized: layoutInitialized,
} = useCardLayout()
const availableSkillLevels = computed(() =>
  getCardSkillAvailableLevels(skills.value, connectEffects.value),
)
const {
  fields,
  skillLevels,
  toggleField,
  toggleSkillLevel,
  reset: resetFields,
  initialized: fieldsInitialized,
} = useCardFields(availableSkillLevels.value)
function resetDisplay() {
  resetLayout()
  resetFields()
}
const ready = computed(
  () =>
    conditionsReady.value && layoutInitialized.value && fieldsInitialized.value,
)
const openPanels = ref<string[]>(['filters', 'display'])
const cardListElement = ref<HTMLElement | null>(null)
const { revision: deferRevision, scheduleRecheck } =
  useCardDeferredContent(cardListElement)
const accordionContentPt = {
  transition: {
    onAfterEnter: scheduleRecheck,
    onAfterLeave: scheduleRecheck,
  },
}
const visibleCards = computed(() =>
  filterAndSortCards(
    cardItems.value,
    conditions.value,
    skillCatalog.cardSkills,
    skillCatalog.canonicalKeys,
    connectCatalog.cardExtents,
    searchTextByCardId.value,
  ),
)
const visibleCardIds = computed(() => visibleCards.value.map(({ id }) => id))
const connectCountCards = computed(() =>
  filterAndSortCards(
    cardItems.value,
    { ...conditions.value, connect: [] },
    skillCatalog.cardSkills,
    skillCatalog.canonicalKeys,
    connectCatalog.cardExtents,
    searchTextByCardId.value,
  ),
)
const connectCounts = computed(() =>
  countCardConnectOptions(
    connectCatalog.options,
    connectCountCards.value.map(({ id }) => id),
    connectCatalog.cardExtents,
  ),
)
watch(
  [
    () => visibleCardIds.value.join('\n'),
    layout,
    fields,
    skillLevels,
    gameLocale,
    locale,
    openPanels,
  ],
  () => scheduleRecheck(),
  { deep: true, flush: 'post' },
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
      searchNames: name ? Object.values(name).join(' ') : '',
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
const fieldOptions = computed(() =>
  CARD_LIST_FIELDS.map((field) => ({
    value: field,
    label: t(`cardList.field.${field}`),
    levels: isSkillField(field) ? availableSkillLevels.value[field] : [],
  })),
)
const basicFieldOptions = computed(() =>
  fieldOptions.value.filter((option) =>
    (CARD_BASIC_INFORMATION_FIELDS as readonly string[]).includes(option.value),
  ),
)
const selectedGroups = computed(() => getCardListFieldGroups(fields.value))
function isSkillField(field: CardListField): field is CardSkillField {
  return CARD_SKILL_FIELDS.includes(field as CardSkillField)
}
function selectedOrder(group: CardListFieldGroup['key']) {
  const index = selectedGroups.value.findIndex((item) => item.key === group)
  return index < 0 ? null : index + 1
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
      <p
        v-if="!ready"
        class="py-16 text-center text-sm text-muted-color"
        role="status"
      >
        {{ t('cardList.loading') }}
      </p>

      <template v-else>
        <section
          class="mx-auto mb-4 w-full max-w-[100rem] overflow-hidden rounded-xl border border-surface-200 bg-surface-0 dark:border-surface-700 dark:bg-surface-900"
          :aria-label="t('cardList.controls')"
        >
          <Accordion v-model:value="openPanels" multiple>
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
                  @click="resetConditions"
                >
                  <RotateCcw
                    aria-hidden="true"
                    :size="20"
                    :stroke-width="2"
                    color="currentColor"
                  />
                </Button>
              </div>
              <AccordionContent :pt="accordionContentPt">
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
                      <MultiSelect
                        v-model="conditions.character"
                        class="w-full"
                        :options="characterOptions"
                        option-label="label"
                        option-value="value"
                        :placeholder="t('cardList.allCharacters')"
                        :aria-label="t('cardList.character')"
                        filter
                        :filter-fields="['searchNames', 'value']"
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
                            <span :lang="option.lang">{{ option.text }}</span>
                          </div>
                        </template>
                        <template #chip="{ value, removeCallback }">
                          <Chip
                            class="p-multiselect-chip"
                            :label="
                              characterOptions.find(
                                (option) => option.value === value,
                              )?.text ?? value
                            "
                            :lang="
                              characterOptions.find(
                                (option) => option.value === value,
                              )?.lang
                            "
                            removable
                            @remove="removeCallback($event, value)"
                          />
                        </template>
                      </MultiSelect>
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
                        :visible-card-count="visibleCards.length"
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
                          <div
                            v-if="selectedSortOption"
                            class="flex items-center gap-2"
                          >
                            <CardListIcon
                              v-if="isStatSortKey(selectedSortOption.value)"
                              :src="
                                getCardStatIconUrl(selectedSortOption.value)
                              "
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
            <AccordionPanel value="display">
              <div class="flex items-stretch">
                <AccordionHeader class="min-w-0 flex-1">
                  <span
                    class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2"
                  >
                    <span>{{ t('cardList.displaySettings') }}</span>
                    <span class="text-sm font-normal text-muted-color">
                      {{ t(`cardList.layout.${layout}`) }} ·
                      {{
                        t('cardList.fieldsCount', {
                          count: selectedGroups.length,
                        })
                      }}
                    </span>
                  </span>
                </AccordionHeader>
                <Button
                  id="card-display-reset"
                  type="button"
                  severity="secondary"
                  text
                  class="!h-auto min-h-11 !w-14 shrink-0 rounded-none !p-0"
                  :aria-label="t('cardList.resetDisplay')"
                  :title="t('cardList.resetDisplay')"
                  @click="resetDisplay"
                >
                  <RotateCcw
                    aria-hidden="true"
                    :size="20"
                    :stroke-width="2"
                    color="currentColor"
                  />
                </Button>
              </div>
              <AccordionContent :pt="accordionContentPt">
                <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <fieldset class="w-full border-0 p-0 sm:w-52">
                    <legend class="mb-1.5 text-sm font-medium">
                      {{ t('cardList.layoutLabel') }}
                    </legend>
                    <div class="flex gap-2">
                      <Button
                        v-for="option in layoutOptions"
                        :key="option.value"
                        type="button"
                        class="!size-11 !p-0"
                        :severity="
                          layout === option.value ? 'primary' : 'secondary'
                        "
                        :outlined="layout !== option.value"
                        :aria-label="option.label"
                        :aria-pressed="layout === option.value"
                        :title="option.label"
                        @click="layout = option.value"
                      >
                        <SquareText
                          v-if="option.value === 'full'"
                          aria-hidden="true"
                          :size="20"
                          :stroke-width="2"
                          color="currentColor"
                        />
                        <LayoutList
                          v-else
                          aria-hidden="true"
                          :size="20"
                          :stroke-width="2"
                          color="currentColor"
                        />
                      </Button>
                    </div>
                  </fieldset>
                  <fieldset class="min-w-0 flex-1">
                    <legend class="mb-1.5 text-sm font-medium">
                      {{ t('cardList.fieldsLabel') }}
                    </legend>
                    <p class="mb-2 text-xs text-muted-color">
                      {{ t('cardList.fieldOrderHelp') }}
                    </p>
                    <div
                      class="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-2"
                    >
                      <template
                        v-for="option in fieldOptions"
                        :key="option.value"
                      >
                        <InputGroup
                          v-if="option.value === 'name'"
                          role="group"
                          aria-labelledby="card-field-label-basic"
                          class="w-auto min-w-0 max-w-full flex-wrap items-stretch"
                          style="
                            --p-inputgroup-addon-border-radius: 0.25rem;
                            --p-inputgroup-addon-background: var(
                              --p-button-secondary-background
                            );
                            --p-inputgroup-addon-border-color: var(
                              --p-button-outlined-secondary-border-color
                            );
                          "
                        >
                          <InputGroupAddon
                            class="h-auto min-h-8 min-w-0 max-w-full flex-none flex-wrap gap-1.5 px-2 py-1 text-sm leading-5 font-medium select-none"
                          >
                            <Badge
                              :value="selectedOrder('basic') ?? '−'"
                              severity="contrast"
                              aria-hidden="true"
                              class="size-5 min-w-5 shrink-0 rounded-full p-0 leading-5"
                            />
                            <span
                              id="card-field-label-basic"
                              class="min-w-0 text-color break-words"
                            >
                              {{ t('cardList.basicInformation') }}
                            </span>
                          </InputGroupAddon>
                          <Button
                            v-for="basicOption in basicFieldOptions"
                            :id="`card-field-${basicOption.value}`"
                            :key="basicOption.value"
                            :aria-label="basicOption.label"
                            :aria-pressed="fields.includes(basicOption.value)"
                            :outlined="!fields.includes(basicOption.value)"
                            :severity="
                              fields.includes(basicOption.value)
                                ? 'primary'
                                : 'secondary'
                            "
                            size="small"
                            class="h-auto min-h-8 min-w-0 max-w-full flex-none whitespace-normal px-2 py-1 text-sm leading-5 font-medium"
                            :class="{
                              'text-color': !fields.includes(basicOption.value),
                            }"
                            @click="
                              toggleField(
                                basicOption.value,
                                !fields.includes(basicOption.value),
                              )
                            "
                          >
                            <span class="min-w-0 whitespace-normal break-words">
                              {{ basicOption.label }}
                            </span>
                          </Button>
                        </InputGroup>

                        <InputGroup
                          v-else-if="isSkillField(option.value)"
                          role="group"
                          :aria-labelledby="`card-field-label-${option.value}`"
                          class="w-auto min-w-0 max-w-full flex-none"
                          style="
                            --p-inputgroup-addon-border-radius: 0.25rem;
                            --p-inputgroup-addon-background: var(
                              --p-button-secondary-background
                            );
                            --p-inputgroup-addon-border-color: var(
                              --p-button-outlined-secondary-border-color
                            );
                          "
                        >
                          <InputGroupAddon
                            class="h-8 min-w-0 gap-1.5 px-2 py-1 text-sm leading-5 font-medium select-none"
                          >
                            <Badge
                              :value="selectedOrder(option.value) ?? '−'"
                              severity="contrast"
                              aria-hidden="true"
                              class="size-5 min-w-5 shrink-0 rounded-full p-0 leading-5"
                            />
                            <span
                              :id="`card-field-label-${option.value}`"
                              class="min-w-0 text-color"
                            >
                              {{ option.label }}
                            </span>
                          </InputGroupAddon>
                          <Button
                            v-for="level in option.levels"
                            :id="`card-field-${option.value}-level-${level}`"
                            :key="level"
                            :aria-label="
                              t('cardList.skillLevelOption', {
                                skill: option.label,
                                level,
                              })
                            "
                            :aria-pressed="
                              skillLevels[
                                option.value as CardSkillField
                              ].includes(level)
                            "
                            :outlined="
                              !skillLevels[
                                option.value as CardSkillField
                              ].includes(level)
                            "
                            :severity="
                              skillLevels[
                                option.value as CardSkillField
                              ].includes(level)
                                ? 'primary'
                                : 'secondary'
                            "
                            size="small"
                            class="h-8 shrink-0 px-2 py-1 text-sm leading-5 font-medium"
                            :class="{
                              'text-color':
                                !skillLevels[
                                  option.value as CardSkillField
                                ].includes(level),
                            }"
                            @click="
                              toggleSkillLevel(
                                option.value as CardSkillField,
                                level,
                                !skillLevels[
                                  option.value as CardSkillField
                                ].includes(level),
                              )
                            "
                          >
                            <span>
                              {{ t('cardList.skillLevel', { level }) }}
                            </span>
                          </Button>
                        </InputGroup>
                        <Button
                          v-else-if="option.value === 'costume'"
                          :id="`card-field-${option.value}`"
                          :aria-label="option.label"
                          :aria-pressed="fields.includes(option.value)"
                          :outlined="!fields.includes(option.value)"
                          :severity="
                            fields.includes(option.value)
                              ? 'primary'
                              : 'secondary'
                          "
                          size="small"
                          class="h-8 max-w-full gap-1.5 rounded px-2 py-1 text-sm leading-5 font-medium"
                          :class="{
                            'text-color': !fields.includes(option.value),
                          }"
                          @click="
                            toggleField(
                              option.value,
                              !fields.includes(option.value),
                            )
                          "
                        >
                          <Badge
                            :value="selectedOrder(option.value) ?? '−'"
                            severity="contrast"
                            aria-hidden="true"
                            class="size-5 min-w-5 shrink-0 rounded-full p-0 leading-5"
                          />
                          <span>{{ option.label }}</span>
                        </Button>
                      </template>
                    </div>
                  </fieldset>
                </div>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </section>

        <p class="mb-4 text-sm text-muted-color" aria-live="polite">
          {{
            t('cardList.resultCount', {
              visible: visibleCards.length,
              total: cardItems.length,
            })
          }}
        </p>

        <p
          v-if="visibleCards.length === 0"
          class="py-16 text-center text-sm text-muted-color"
          role="status"
        >
          {{ t('cardList.noResults') }}
        </p>
        <div
          v-else
          :class="
            layout === 'vertical' &&
            selectedGroups.length > 0 &&
            'overflow-x-auto'
          "
          :tabindex="
            layout === 'vertical' && selectedGroups.length > 0 ? 0 : undefined
          "
          :role="
            layout === 'vertical' && selectedGroups.length > 0
              ? 'region'
              : undefined
          "
          :aria-label="
            layout === 'vertical' && selectedGroups.length > 0
              ? t('cards')
              : undefined
          "
        >
          <ul
            ref="cardListElement"
            class="grid list-none p-0"
            :class="
              layout === 'full'
                ? 'grid-cols-[repeat(auto-fill,minmax(min(100%,350px),1fr))] gap-x-5 gap-y-0'
                : [
                    'grid-cols-1 gap-y-5',
                    selectedGroups.length > 0 && 'card-list-vertical-has-info',
                  ]
            "
            :style="{ '--card-list-field-count': selectedGroups.length }"
            :aria-label="t('cards')"
          >
            <CardListItem
              v-for="card in visibleCards"
              :key="card.id"
              :card="card"
              :costumes="costumes"
              :skills="skills"
              :connect-effects="connectEffects"
              :connect-extents="connectExtents"
              :game-locale="gameLocale"
              :stat-keys="statKeys"
              :layout="layout"
              :fields="fields"
              :skill-levels="skillLevels"
              :defer-revision="deferRevision"
              @content-loaded="scheduleRecheck"
            />
          </ul>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.card-list-vertical-has-info {
  min-width: calc(
    6rem + 1.5rem + 2px + var(--card-list-field-count) * 12rem +
      (var(--card-list-field-count) - 1) * 1rem
  );
}
</style>
