<script setup lang="ts">
import type { GameLocale } from '#shared/language'
import type {
  CardListPayload,
  CardStatKey,
} from '#shared/game-data/cards/list-data'
import { buildCardSkillFilterCatalog } from '#shared/game-data/cards/skill-filter'
import {
  buildCardConnectFilterCatalog,
  countCardConnectOptions,
} from '#shared/game-data/cards/connect-filter'
import {
  filterAndSortCards,
  getCardFilterOptions,
} from '#shared/game-data/cards/list'
import {
  getCardSkillAvailableLevels,
  getCardListFieldGroups,
} from '#shared/game-data/cards/display'
import { useCardListConditions } from '~/composables/card/useCardListConditions'
import { useCardLayout } from '~/composables/card/useCardLayout'
import { useCardFields } from '~/composables/card/useCardFields'
import { useCardDeferredContent } from '~/composables/card/useCardDeferredContent'
import { useListPanels } from '~/composables/useListPanels'

const props = defineProps<{
  payload: CardListPayload
  gameLocale: GameLocale
}>()
const { t, locale } = useI18n()
const gameLocale = computed(() => props.gameLocale)
const payload = computed(() => props.payload)

const cardItems = computed(() => payload.value.cards)
const costumes = computed(() => payload.value.costumes)
const skills = computed(() => payload.value.skills)
const connectEffects = computed(() => payload.value.connectEffects)
const connectExtents = computed(() => payload.value.connectExtents)
const searchTextByCardId = computed(() => payload.value.searchTextByCardId)
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
const { panels: openPanels, initialized: panelsInitialized } =
  useListPanels('cards')
const ready = computed(
  () =>
    conditionsReady.value &&
    layoutInitialized.value &&
    fieldsInitialized.value &&
    panelsInitialized.value,
)
const cardListElement = ref<HTMLElement | null>(null)
const { revision: deferRevision, scheduleRecheck } =
  useCardDeferredContent(cardListElement)
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
const statKeys: CardStatKey[] = ['performance', 'technique', 'sense']
const selectedGroups = computed(() => getCardListFieldGroups(fields.value))
</script>

<template>
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
        <CardListFilters
          v-model="conditions"
          v-model:selected-skill-keys="selectedSkillKeys"
          :cards="cardItems"
          :filter-options="filterOptions"
          :game-locale="gameLocale"
          :skill-catalog="skillCatalog"
          :connect-catalog="connectCatalog"
          :connect-counts="connectCounts"
          :visible-card-ids="visibleCardIds"
          :skill-query-supported="skillQuerySupported"
          :skill-query-error="skillQueryError"
          @reset="resetConditions"
          @after-toggle="scheduleRecheck"
        />
        <CardListDisplaySettings
          v-model:layout="layout"
          :fields="fields"
          :skill-levels="skillLevels"
          :available-skill-levels="availableSkillLevels"
          @reset="resetDisplay"
          @toggle-field="toggleField"
          @toggle-skill-level="toggleSkillLevel"
          @after-toggle="scheduleRecheck"
        />
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
        layout === 'vertical' && selectedGroups.length > 0 && 'overflow-x-auto'
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
</template>

<style scoped>
.card-list-vertical-has-info {
  min-width: calc(
    6rem + 1.5rem + 2px + var(--card-list-field-count) * 12rem +
      (var(--card-list-field-count) - 1) * 1rem
  );
}
</style>
