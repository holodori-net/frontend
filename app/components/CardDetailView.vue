<script setup lang="ts">
import {
  resolveLocalizedName,
  gameLocaleLanguages,
  type GameLocale,
} from '#shared/language'
import { onBeforeRouteLeave } from 'vue-router'
import type {
  CardDetailPayload,
  CardGrowthSelection,
} from '#shared/game-data/card-detail'
import type {
  CardListSkillData,
  CardStatKey,
} from '#shared/game-data/card-list-data'
import {
  calculateCardGrowth,
  getMaxCardGrowth,
  normalizeCardGrowthSelection,
} from '#shared/game-data/card-stats'
import {
  composeActiveSkillDescription,
  composeCostumeSkillDescription,
  composePassiveSkillDescription,
  composeSpecialSkillDescription,
} from '#shared/game-data/live-skill-description'
import { getCardStatIconUrl } from '#shared/game-data/card-icons'

const props = defineProps<{
  payload: CardDetailPayload
  gameLocale: GameLocale
}>()
const { t, locale } = useI18n()
const numberFormatter = computed(() => new Intl.NumberFormat(locale.value))
const maximum = computed(() => getMaxCardGrowth(props.payload.growth))
const persistedSelection = useState<{
  cardId: string
  selection: CardGrowthSelection
} | null>('card-growth-selection', () => null)
const selection = ref<CardGrowthSelection>(
  persistedSelection.value?.cardId === props.payload.card.id
    ? normalizeCardGrowthSelection(
        props.payload.growth,
        persistedSelection.value.selection,
      )
    : { ...maximum.value },
)
const normalizedSelection = computed(() =>
  normalizeCardGrowthSelection(props.payload.growth, selection.value),
)
watch(
  selection,
  (value) => {
    persistedSelection.value = {
      cardId: props.payload.card.id,
      selection: normalizeCardGrowthSelection(props.payload.growth, value),
    }
  },
  { deep: true },
)
watch(
  () => props.payload.card.id,
  (id) => {
    const saved = persistedSelection.value
    selection.value =
      saved?.cardId === id
        ? normalizeCardGrowthSelection(props.payload.growth, saved.selection)
        : { ...maximum.value }
  },
)
onBeforeRouteLeave((to) => {
  if (String(to.params.id) !== props.payload.card.id)
    persistedSelection.value = null
})
const growth = computed(() =>
  calculateCardGrowth(props.payload.growth, normalizedSelection.value),
)
const displayedCard = computed(() => ({
  ...props.payload.card,
  ...growth.value,
}))
const cardName = computed(() =>
  resolveLocalizedName(props.payload.card.name, props.gameLocale),
)
const characterName = computed(() =>
  resolveLocalizedName(props.payload.card.characterName, props.gameLocale),
)
const skillLocale = computed(() => gameLocaleLanguages[props.gameLocale])
const limits = computed(() =>
  [
    ...new Set(
      props.payload.growth.levelLimits.map((row) => row.limitBreakCount),
    ),
  ].sort((a, b) => a - b),
)
const levels = computed(() =>
  props.payload.growth.levels
    .filter(
      (row) =>
        row.level <=
        Math.max(
          ...props.payload.growth.levelLimits
            .filter(
              (limit) =>
                limit.limitBreakCount ===
                normalizedSelection.value.limitBreakCount,
            )
            .map((limit) => limit.levelLimit),
        ),
    )
    .map((row) => row.level)
    .sort((a, b) => a - b),
)
const potentials = computed(() =>
  [
    ...new Set([
      0,
      ...props.payload.growth.potentials.map((row) => row.upgradeCount),
    ]),
  ].sort((a, b) => a - b),
)
const skillDescriptions = computed(() => {
  const skills: CardListSkillData = props.payload.skills
  const card = props.payload.card
  const byLevels = <T extends { level: number }>(
    rows: readonly T[] | undefined,
    level: number,
    describe: (row: T) => string | null,
  ) => {
    const item = rows?.find((row) => row.level === level)
    if (!item) return []
    const text = describe(item)
    return [
      {
        level,
        text: text ?? t('cardList.skillUnavailable'),
        lang: text === null ? locale.value : skillLocale.value,
      },
    ]
  }
  return {
    passiveSkill: byLevels(
      skills.passiveSkills[card.livePassiveSkillId],
      growth.value.skillLevels.passiveSkill,
      (row) =>
        composePassiveSkillDescription(
          row,
          skills,
          props.gameLocale,
          undefined,
          'display',
        ),
    ),
    activeSkill: byLevels(
      skills.activeSkills[card.liveActiveSkillId],
      growth.value.skillLevels.activeSkill,
      (row) =>
        composeActiveSkillDescription(
          row,
          skills,
          props.gameLocale,
          undefined,
          'display',
        ),
    ),
    specialSkill: byLevels(
      skills.specialSkills[card.liveSpecialSkillId],
      growth.value.skillLevels.specialSkill,
      (row) =>
        composeSpecialSkillDescription(
          row,
          skills,
          props.gameLocale,
          undefined,
          'display',
        ),
    ),
  }
})
const costume = computed(() =>
  props.payload.card.costumeId
    ? props.payload.costumes[props.payload.card.costumeId]
    : undefined,
)
const costumeSkill = computed(() =>
  costume.value?.leaderSkillId
    ? props.payload.skills.leaderSkills[costume.value.leaderSkillId]
    : undefined,
)
const costumeDescription = computed(() =>
  costumeSkill.value
    ? composeCostumeSkillDescription(
        costumeSkill.value,
        props.payload.skills,
        props.gameLocale,
      )
    : null,
)
const connectLevels = computed(() => {
  const id = props.payload.card.skillTreeConnectEffectId
  return id ? (props.payload.connectEffects[id] ?? []) : []
})
const connectPositions = computed(() => {
  const level = connectLevels.value.find(
    (row) => row.level === growth.value.skillLevels.connectEffect,
  )
  return level ? (props.payload.connectExtents[level.extentGroupId] ?? []) : []
})
const levelOptions = computed(() =>
  levels.value.map((value) => ({ label: String(value), value })),
)
const limitOptions = computed(() =>
  limits.value.map((value) => ({ label: String(value), value })),
)
const potentialOptions = computed(() =>
  potentials.value.map((value) => ({ label: String(value), value })),
)
const statKeys: CardStatKey[] = ['performance', 'technique', 'sense']
function resetGrowth() {
  selection.value = { ...maximum.value }
}
function changeLevel(value: number | null | undefined) {
  if (value == null) return
  selection.value = normalizeCardGrowthSelection(props.payload.growth, {
    ...selection.value,
    level: value,
  })
}
function changePotential(value: number | null | undefined) {
  if (value == null) return
  selection.value = normalizeCardGrowthSelection(props.payload.growth, {
    ...selection.value,
    potentialUpgradeCount: value,
  })
}
function changeLimitBreak(value: number | null | undefined) {
  if (value == null) return
  const nextLimit = props.payload.growth.levelLimits
    .filter((row) => row.limitBreakCount === value)
    .reduce((max, row) => Math.max(max, row.levelLimit), 1)
  selection.value = normalizeCardGrowthSelection(props.payload.growth, {
    ...selection.value,
    limitBreakCount: value,
    level: Math.min(selection.value.level, nextLimit),
  })
}
</script>

<template>
  <article class="mx-auto w-full max-w-[100rem] space-y-8">
    <header class="space-y-1">
      <h1 class="mb-0 text-2xl font-bold sm:text-3xl" :lang="cardName.lang">
        {{ cardName.text }}
      </h1>
      <p class="mb-0 text-sm text-muted-color" :lang="characterName.lang">
        {{ characterName.text }}
      </p>
    </header>
    <div class="grid items-start gap-6 lg:grid-cols-2">
      <CardListContent
        :card="displayedCard"
        :costumes="payload.costumes"
        :skills="payload.skills"
        :connect-effects="payload.connectEffects"
        :connect-extents="payload.connectExtents"
        :game-locale="gameLocale"
        :stat-keys="statKeys"
        :fields="[]"
        :linked="false"
        image-size="original"
      />
      <section
        class="min-w-0 space-y-6"
        :aria-label="t('cardDetail.growthTitle')"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="mb-0 text-lg font-semibold">
            {{ t('cardDetail.growthTitle') }}
          </h2>
          <Button
            type="button"
            severity="secondary"
            outlined
            :label="t('cardDetail.resetGrowth')"
            @click="resetGrowth"
          />
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <label for="card-detail-level" class="grid gap-2 text-sm"
            ><span>{{ t('cardDetail.level') }}</span
            ><Select
              input-id="card-detail-level"
              :aria-label="t('cardDetail.level')"
              :model-value="selection.level"
              :options="levelOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              @update:model-value="changeLevel"
          /></label>
          <label for="card-detail-limit-break" class="grid gap-2 text-sm"
            ><span>{{ t('cardDetail.limitBreak') }}</span
            ><Select
              input-id="card-detail-limit-break"
              :aria-label="t('cardDetail.limitBreak')"
              :model-value="selection.limitBreakCount"
              :options="limitOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              @update:model-value="changeLimitBreak"
          /></label>
          <label for="card-detail-potential" class="grid gap-2 text-sm"
            ><span>{{ t('cardDetail.potential') }}</span
            ><Select
              input-id="card-detail-potential"
              :aria-label="t('cardDetail.potential')"
              :model-value="selection.potentialUpgradeCount"
              :options="potentialOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              @update:model-value="changePotential"
          /></label>
        </div>
        <section aria-labelledby="card-detail-stats-title" class="space-y-3">
          <h2 id="card-detail-stats-title" class="mb-0 text-lg font-semibold">
            {{ t('cardList.field.parameters') }}
          </h2>
          <p class="mb-0 text-sm text-muted-color">
            {{ t('cardDetail.statsDescription') }}
          </p>
          <dl
            class="grid grid-cols-2 gap-3 sm:grid-cols-4"
            aria-live="polite"
            aria-atomic="true"
          >
            <div
              v-for="stat in statKeys"
              :key="stat"
              class="flex min-w-0 items-center gap-2 rounded-lg bg-surface-100 p-3 dark:bg-surface-800"
            >
              <dt class="sr-only">{{ t(`cardList.stat.${stat}`) }}</dt>
              <dd
                class="m-0 inline-flex min-w-0 flex-wrap items-center gap-2 font-semibold tabular-nums"
              >
                <CardListIcon
                  :src="getCardStatIconUrl(stat)"
                  :label="t(`cardList.stat.${stat}`)"
                  monochrome
                  size="small"
                /><span
                  :class="
                    growth.specializations.includes(stat) && 'text-primary'
                  "
                  >{{ numberFormatter.format(growth.stats[stat]) }}</span
                >
              </dd>
            </div>
            <div class="rounded-lg bg-surface-100 p-3 dark:bg-surface-800">
              <dt class="text-xs text-muted-color">
                {{ t('cardList.total') }}
              </dt>
              <dd class="mb-0 font-bold tabular-nums">
                {{ numberFormatter.format(growth.total) }}
              </dd>
            </div>
          </dl>
        </section>
      </section>
    </div>
    <section class="grid gap-6 lg:grid-cols-2">
      <CardListSkillSection
        v-if="skillDescriptions.passiveSkill.length"
        :title="t('cardList.field.passiveSkill')"
        :levels="skillDescriptions.passiveSkill"
      />
      <CardListSkillSection
        v-if="skillDescriptions.activeSkill.length"
        :title="t('cardList.field.activeSkill')"
        :levels="skillDescriptions.activeSkill"
      />
      <CardListSkillSection
        v-if="skillDescriptions.specialSkill.length"
        :title="t('cardList.field.specialSkill')"
        :levels="skillDescriptions.specialSkill"
      />
      <section v-if="costume && costumeDescription" class="min-w-0">
        <Divider
          align="left"
          role="presentation"
          :aria-orientation="null"
          class="my-2"
          ><h2 class="m-0 text-sm font-semibold">
            {{ t('cardList.field.costume') }}
            <span
              :lang="resolveLocalizedName(costume.name, gameLocale).lang"
              class="text-xs font-normal text-muted-color"
              >{{ resolveLocalizedName(costume.name, gameLocale).text }}</span
            >
          </h2></Divider
        ><CardListSkillText :text="costumeDescription" :lang="skillLocale" />
      </section>
      <CardListConnectSection
        v-if="
          connectLevels.some(
            (row) => row.level === growth.skillLevels.connectEffect,
          )
        "
        :title="t('cardList.field.connectEffect')"
        :game-locale="gameLocale"
        :levels="
          connectLevels.filter(
            (row) => row.level === growth.skillLevels.connectEffect,
          )
        "
        :positions="connectPositions"
      />
    </section>
  </article>
</template>
