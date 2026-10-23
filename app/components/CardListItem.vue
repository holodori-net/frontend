<script setup lang="ts">
import { resolveLocalizedName, type GameLocale } from '#shared/language'
import type {
  CardListCostumeData,
  CardListConnectEffectLevelData,
  CardListItemData,
  CardListSkillData,
  CardStatKey,
} from '#shared/game-data/card-list-data'
import type { ConnectPosition } from '#shared/game-data/skill-tree-connect-effects'
import {
  CARD_LIST_FIELDS,
  type CardSkillField,
  type CardListField,
  type CardListLayout,
} from '#shared/game-data/card-list'

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
    deferRevision?: number
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
    deferRevision: 0,
  },
)

const emit = defineEmits<{
  contentLoaded: []
}>()

const loaded = ref(false)
const mountRevision = ref(props.deferRevision)
watch(
  () => props.deferRevision,
  (revision) => {
    if (!loaded.value) mountRevision.value = revision
  },
)
const cardName = computed(() =>
  resolveLocalizedName(props.card.name, props.gameLocale),
)
const informationHeight = computed(() => {
  if (!props.fields.length) return '0rem'

  let height = 2
  for (const field of props.fields) {
    if (field === 'name') height += 2.5
    else if (field === 'characterName') height += 2
    else if (field === 'parameters') height += 5
    else if (field === 'costume' && props.card.costumeId) height += 8
    else if (field === 'connectEffect') {
      const effectId = props.card.skillTreeConnectEffectId
      const count = effectId
        ? (props.connectEffects[effectId] ?? []).filter((level) =>
            props.skillLevels.connectEffect.includes(level.level),
          ).length
        : 0
      if (count) height += 8 + count * 4
    } else if (
      field === 'passiveSkill' ||
      field === 'activeSkill' ||
      field === 'specialSkill'
    ) {
      const skillId =
        field === 'passiveSkill'
          ? props.card.livePassiveSkillId
          : field === 'activeSkill'
            ? props.card.liveActiveSkillId
            : props.card.liveSpecialSkillId
      const levels =
        field === 'passiveSkill'
          ? props.skills.passiveSkills[skillId]
          : field === 'activeSkill'
            ? props.skills.activeSkills[skillId]
            : props.skills.specialSkills[skillId]
      const count = (levels ?? []).filter((level) =>
        props.skillLevels[field].includes(level.level),
      ).length
      if (count) height += 4 + count * 4
    }
  }
  return `${height}rem`
})
const fullSubgridStyle = computed(() => ({
  '--card-list-row-span': String(1 + props.fields.length),
  '--card-list-info-height': informationHeight.value,
}))
const placeholderStyle = computed(() => ({
  '--card-list-info-height': informationHeight.value,
}))
function onContentLoad() {
  if (loaded.value) return
  loaded.value = true
  emit('contentLoaded')
}
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
      class="card-list-article relative min-w-0"
      :class="layout === 'full' && 'card-list-article--full-subgrid'"
      :style="layout === 'full' ? fullSubgridStyle : undefined"
      :aria-labelledby="`card-name-${card.id}`"
    >
      <span :id="`card-name-${card.id}`" class="sr-only" :lang="cardName.lang">
        {{ cardName.text }}
      </span>

      <div
        v-if="!loaded"
        aria-hidden="true"
        class="card-list-placeholder"
        :class="[
          layout === 'full' && 'card-list-placeholder--full-subgrid',
          layout === 'vertical' &&
            fields.length > 0 &&
            'card-list-placeholder--vertical',
          layout === 'vertical' &&
            !fields.length &&
            'card-list-placeholder--art-only-vertical',
        ]"
        :style="placeholderStyle"
      >
        <div class="card-list-placeholder-art" />
        <div v-if="fields.length" class="card-list-placeholder-info" />
      </div>

      <DeferredContent
        :key="mountRevision"
        class="card-list-deferred"
        :class="[
          layout === 'full' && 'card-list-deferred--full-subgrid',
          loaded && 'card-list-deferred--loaded',
        ]"
        :style="layout === 'full' ? fullSubgridStyle : undefined"
        @load="onContentLoad"
      >
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
      </DeferredContent>
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

.card-list-deferred {
  position: absolute;
  inset: 0;
}

.card-list-deferred--full-subgrid {
  display: grid;
  grid-row: 1 / -1;
  grid-template-rows: subgrid;
}

.card-list-deferred--loaded {
  position: relative;
  inset: auto;
}

.card-list-placeholder {
  position: relative;
  display: grid;
  min-width: 0;
  align-content: start;
  overflow: hidden;
  border: 1px solid var(--p-surface-200);
  border-radius: 1rem;
  background: var(--p-surface-0);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
}

.dark .card-list-placeholder {
  border-color: var(--p-surface-700);
  background: var(--p-surface-900);
}

.card-list-placeholder--full-subgrid {
  grid-row: 1 / -1;
  grid-template-rows: subgrid;
}

.card-list-placeholder--vertical {
  grid-template-columns: 6rem minmax(0, 1fr);
  min-height: 24rem;
}

.card-list-placeholder--art-only-vertical {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 0;
  width: 100%;
  max-width: 16rem;
  aspect-ratio: 256 / 366;
}

.card-list-placeholder-art {
  grid-row: 1;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--p-surface-100);
}

.dark .card-list-placeholder-art {
  background: var(--p-surface-800);
}

.card-list-placeholder--vertical .card-list-placeholder-art {
  aspect-ratio: 256 / 366;
}

.card-list-placeholder--art-only-vertical .card-list-placeholder-art {
  aspect-ratio: 256 / 366;
}

.card-list-placeholder-info {
  grid-row: 2 / -1;
  min-width: 0;
  min-height: var(--card-list-info-height, 12rem);
  padding: 1rem;
}

.card-list-placeholder--vertical .card-list-placeholder-info {
  grid-column: 2;
  grid-row: 1;
  min-height: 0;
}
</style>
