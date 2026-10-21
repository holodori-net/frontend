<script setup lang="ts">
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
import {
  getCardAttributeIconUrl,
  getCardStatIconUrl,
} from '#shared/game-data/card-icons'
import { getCharacterIconUrl } from '#shared/game-data/character-list'
import {
  filterAndSortCards,
  getCardFilterOptions,
  getCardSkillAvailableLevels,
  CARD_SKILL_FIELDS,
  CARD_LIST_FIELDS,
  type CardListField,
  type CardSkillField,
  type CardListLayout,
  type CardListSort,
} from '#shared/game-data/card-list'
import { useCardListConditions } from '~/composables/useCardListConditions'
import { useCardLayout } from '~/composables/useCardLayout'
import { useCardFields } from '~/composables/useCardFields'

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

const cardItems = computed(() => payload.value!.cards)
const costumes = computed(() => payload.value!.costumes)
const skills = computed(() => payload.value!.skills)
const filterOptions = computed(() => getCardFilterOptions(cardItems.value))
const {
  conditions,
  reset: resetConditions,
  ready: conditionsReady,
} = useCardListConditions(filterOptions)
const {
  layout,
  reset: resetLayout,
  initialized: layoutInitialized,
} = useCardLayout()
const availableSkillLevels = computed(() =>
  getCardSkillAvailableLevels(skills.value),
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
const openPanels = ref<string[]>(['filters'])
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
function isSkillField(field: CardListField): field is CardSkillField {
  return CARD_SKILL_FIELDS.includes(field as CardSkillField)
}
function selectedOrder(field: CardListField) {
  const index = fields.value.indexOf(field)
  return index < 0 ? null : index + 1
}
</script>

<template>
  <div class="min-h-screen">
    <SiteHeader />
    <main class="mx-auto w-[min(calc(100%-2rem),100rem)] py-8 pb-20 sm:py-12">
      <div class="mb-7">
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
          class="mb-4 overflow-hidden rounded-xl border border-surface-200 bg-surface-0 dark:border-surface-700 dark:bg-surface-900"
          :aria-label="t('cardList.controls')"
        >
          <Accordion v-model:value="openPanels" multiple>
            <AccordionPanel value="filters">
              <AccordionHeader>{{
                t('cardList.filtersAndSort')
              }}</AccordionHeader>
              <AccordionContent>
                <div class="space-y-4">
                  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label class="block min-w-0 lg:col-span-2">
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
                            <span class="game-text" :lang="option.lang">{{
                              option.text
                            }}</span>
                          </div>
                        </template>
                        <template #chip="{ value, removeCallback }">
                          <Chip
                            class="game-text p-multiselect-chip"
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
                  </div>

                  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    <Button
                      type="button"
                      severity="secondary"
                      text
                      @click="resetConditions"
                    >
                      {{ t('cardList.reset') }}
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionPanel>
            <AccordionPanel value="display">
              <AccordionHeader>
                <span
                  class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2"
                >
                  <span>{{ t('cardList.displaySettings') }}</span>
                  <span class="text-sm font-normal text-muted-color">
                    {{ t(`cardList.layout.${layout}`) }} ·
                    {{ t('cardList.fieldsCount', { count: fields.length }) }}
                  </span>
                </span>
              </AccordionHeader>
              <AccordionContent>
                <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <label class="w-full sm:w-52">
                    <span class="mb-1.5 block text-sm font-medium">{{
                      t('cardList.layoutLabel')
                    }}</span>
                    <Select
                      v-model="layout"
                      input-id="card-layout"
                      class="w-full"
                      :options="layoutOptions"
                      option-label="label"
                      option-value="value"
                      :aria-label="t('cardList.layoutLabel')"
                    />
                  </label>
                  <fieldset class="min-w-0 flex-1">
                    <legend class="mb-1.5 text-sm font-medium">
                      {{ t('cardList.fieldsLabel') }}
                    </legend>
                    <p class="mb-2 text-xs text-muted-color">
                      {{ t('cardList.fieldOrderHelp') }}
                    </p>
                    <div
                      class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2"
                    >
                      <template
                        v-for="option in fieldOptions"
                        :key="option.value"
                      >
                        <Button
                          v-if="!isSkillField(option.value)"
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

                        <InputGroup
                          v-else
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
                      </template>
                      <Button
                        id="card-display-reset"
                        type="button"
                        severity="secondary"
                        text
                        size="small"
                        class="h-8 rounded px-2 py-1 text-sm leading-5 font-medium text-color"
                        @click="resetDisplay"
                      >
                        {{ t('cardList.resetDisplay') }}
                      </Button>
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
        <ul
          v-else
          class="grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,350px),1fr))] gap-x-5 p-0"
          :class="layout === 'full' ? 'gap-y-0' : 'gap-y-5'"
          :aria-label="t('cards')"
        >
          <CardListItem
            v-for="card in visibleCards"
            :key="card.id"
            :card="card"
            :costumes="costumes"
            :skills="skills"
            :game-locale="gameLocale"
            :stat-keys="statKeys"
            :layout="layout"
            :fields="fields"
            :skill-levels="skillLevels"
          />
        </ul>
      </template>
    </main>
  </div>
</template>
