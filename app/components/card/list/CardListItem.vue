<script setup lang="ts">
import { resolveLocalizedName, type GameLocale } from '#shared/language'
import type {
  CardListCostumeData,
  CardListConnectEffectLevelData,
  CardListItemData,
  CardListSkillData,
  CardStatKey,
} from '#shared/game-data/cards/list-data'
import type { ConnectPosition } from '#shared/game-data/skill-tree-connect-effects'
import {
  CARD_LIST_FIELDS,
  type CardSkillField,
  type CardListField,
  type CardListLayout,
} from '#shared/game-data/cards/display'

type CardSkillSelections = Readonly<Record<CardSkillField, readonly number[]>>

const props = withDefaults(
  defineProps<{
    card: CardListItemData
    costumes: Record<string, CardListCostumeData>
    skills: CardListSkillData
    connectEffects: Record<string, CardListConnectEffectLevelData[]>
    connectExtents: Record<string, ConnectPosition[]>
    gameLocale: GameLocale
    statKeys: CardStatKey[]
    fields?: readonly CardListField[]
    skillLevels?: CardSkillSelections
    layout?: CardListLayout
  }>(),
  {
    fields: () => CARD_LIST_FIELDS,
    skillLevels: () => ({
      passiveSkill: [2],
      activeSkill: [2],
      specialSkill: [2],
      connectEffect: [1, 2],
    }),
    layout: 'full',
  },
)

const cardName = computed(() =>
  resolveLocalizedName(props.card.name, props.gameLocale),
)
const fullSubgridStyle = computed(() => ({
  '--card-list-row-span': String(1 + props.fields.length),
}))
</script>

<template>
  <li
    class="card-list-container block min-w-0"
    :class="[
      layout === 'full' && 'card-list-container--full-subgrid',
      layout === 'vertical' &&
        !fields.length &&
        'card-list-container--art-only-vertical',
    ]"
    :style="fullSubgridStyle"
  >
    <article
      class="card-list-article min-w-0"
      :class="layout === 'full' && 'card-list-article--full-subgrid'"
      :style="layout === 'full' ? fullSubgridStyle : undefined"
      :aria-labelledby="`card-name-${card.id}`"
    >
      <span :id="`card-name-${card.id}`" class="sr-only" :lang="cardName.lang">
        {{ cardName.text }}
      </span>
      <CardListContent
        :card="card"
        :costumes="costumes"
        :skills="skills"
        :connect-effects="connectEffects"
        :connect-extents="connectExtents"
        :game-locale="gameLocale"
        :stat-keys="statKeys"
        :fields="fields"
        :skill-levels="skillLevels"
        :layout="layout"
      />
    </article>
  </li>
</template>

<style scoped>
.card-list-container {
  container-type: inline-size;
}

.card-list-container--art-only-vertical {
  width: 100%;
  max-width: 16rem;
}

.card-list-container--full-subgrid {
  display: grid;
  grid-row: span var(--card-list-row-span);
  grid-template-rows: subgrid;
  container-type: normal;
  margin-block-end: 1.25rem;
}

.card-list-article--full-subgrid {
  display: grid;
  grid-row: 1 / -1;
  grid-template-rows: subgrid;
}
</style>
