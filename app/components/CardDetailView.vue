<script setup lang="ts">
import { ArrowLeft, Grid2X2, Maximize, Shirt } from '@lucide/vue'
import { NuxtLink } from '#components'
import {
  buildLocalizedPath,
  resolveLocalizedName,
  gameLocaleLanguages,
  type GameLocale,
  type SiteLocale,
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
  selectCardGrowthLevel,
} from '#shared/game-data/card-stats'
import {
  composeActiveSkillDescription,
  composeCostumeSkillDescription,
  composePassiveSkillDescription,
  composeSpecialSkillDescription,
} from '#shared/game-data/live-skill-description'
import { getCostumeThumbnailUrl } from '#shared/game-data/card-icons'
import { tokenizeSkillText } from '#shared/game-data/skill-text'

const props = defineProps<{
  payload: CardDetailPayload
  gameLocale: GameLocale
}>()
const { t, locale } = useI18n()
const fullscreenVisible = ref(false)
const fullscreenPlayer = ref<{ open: () => void } | null>(null)
watch([() => props.payload.card.id, () => props.gameLocale, locale], () => {
  fullscreenVisible.value = false
})
const maximum = computed(() => getMaxCardGrowth(props.payload.growth))
const persistedSelection = useState<{
  cardId: string
  selection: CardGrowthSelection
} | null>('card-growth-selection', () => null)
const selection = ref<CardGrowthSelection>(
  persistedSelection.value?.cardId === props.payload.card.id
    ? selectCardGrowthLevel(
        props.payload.growth,
        persistedSelection.value.selection,
      )
    : { ...maximum.value },
)
const normalizedSelection = computed(() =>
  selectCardGrowthLevel(props.payload.growth, selection.value),
)
const mediaState = useState<{
  cardId: string
  animate: boolean
  showSignature: boolean
} | null>('card-detail-media-state', () => null)
let hasSavedMediaState = mediaState.value?.cardId === props.payload.card.id
const mediaEnabled = computed(() => props.payload.card.assetType === 2)
const animateCard = ref(true)
const showSignature = ref(true)
const mediaVariant = computed(() =>
  normalizedSelection.value.potentialUpgradeCount ===
  maximum.value.potentialUpgradeCount
    ? 'full_1'
    : 'full_0',
)
function restoreMediaState(cardId: string) {
  const saved = mediaState.value
  hasSavedMediaState = saved?.cardId === cardId
  if (saved?.cardId === cardId) {
    animateCard.value = saved.animate
    showSignature.value = saved.showSignature
  } else {
    animateCard.value = true
    showSignature.value = true
  }
}
restoreMediaState(props.payload.card.id)
function saveMediaState(cardId = props.payload.card.id) {
  mediaState.value = {
    cardId,
    animate: animateCard.value,
    showSignature: showSignature.value,
  }
  hasSavedMediaState = true
}
watch([animateCard, showSignature], ([animate, signature]) => {
  mediaState.value = {
    cardId: props.payload.card.id,
    animate,
    showSignature: signature,
  }
  hasSavedMediaState = true
})
watch(
  () => props.payload.card.id,
  (id) => {
    restoreMediaState(id)
    if (
      !hasSavedMediaState &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      animateCard.value = false
    if (!hasSavedMediaState) saveMediaState(id)
  },
)
onMounted(() => {
  if (!hasSavedMediaState) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      animateCard.value = false
    saveMediaState()
  }
})
watch(
  selection,
  (value) => {
    persistedSelection.value = {
      cardId: props.payload.card.id,
      selection: selectCardGrowthLevel(props.payload.growth, value),
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
        ? selectCardGrowthLevel(props.payload.growth, saved.selection)
        : { ...maximum.value }
  },
)
onBeforeRouteLeave((to) => {
  fullscreenVisible.value = false
  if (String(to.params.id) !== props.payload.card.id) {
    persistedSelection.value = null
    mediaState.value = null
  }
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
const levels = computed(() =>
  props.payload.growth.levels
    .filter((row) => row.level <= maximum.value.level)
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
const currentLevelLimit = computed(
  () =>
    props.payload.growth.levelLimits.find(
      (row) =>
        row.limitBreakCount === normalizedSelection.value.limitBreakCount,
    )?.levelLimit ?? maximum.value.level,
)
const skillDescriptions = computed(() => {
  const skills: CardListSkillData = props.payload.skills
  const card = props.payload.card
  const byLevels = <T extends { level: number }>(
    rows: readonly T[] | undefined,
    describe: (row: T) => string | null,
    effectType: (row: T) => number | undefined,
  ) => {
    return [...(rows ?? [])]
      .sort((a, b) => a.level - b.level)
      .map((item) => {
        const text = describe(item)
        return {
          level: item.level,
          effectType: effectType(item) ?? null,
          text: text ?? t('cardList.skillUnavailable'),
          lang: text === null ? locale.value : skillLocale.value,
        }
      })
  }
  return {
    passiveSkill: byLevels(
      skills.passiveSkills[card.livePassiveSkillId],
      (row) =>
        composePassiveSkillDescription(
          row,
          skills,
          props.gameLocale,
          undefined,
          'display',
        ),
      (row) => skills.effects[row.livePassiveSkillEffectGroupId]?.[0]?.type,
    ),
    activeSkill: byLevels(
      skills.activeSkills[card.liveActiveSkillId],
      (row) =>
        composeActiveSkillDescription(
          row,
          skills,
          props.gameLocale,
          undefined,
          'display',
        ),
      (row) =>
        skills.activeEffects[row.liveActiveSkillEffectGroupId]?.[0]?.type,
    ),
    specialSkill: byLevels(
      skills.specialSkills[card.liveSpecialSkillId],
      (row) =>
        composeSpecialSkillDescription(
          row,
          skills,
          props.gameLocale,
          undefined,
          'display',
        ),
      (row) =>
        skills.activeEffects[row.liveActiveSkillEffectGroupId]?.[0]?.type,
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
const connectDescriptions = computed(() =>
  [...connectLevels.value]
    .sort((a, b) => a.level - b.level)
    .map((row) => ({
      level: row.level,
      text: row.description[props.gameLocale].replace(/\[\/?highlight\]/g, ''),
      lang: skillLocale.value,
    })),
)
type PotentialEffect = {
  label: string
  description?: string
  lang: string
}
const potentialOptions = computed(() =>
  potentials.value.map((stage) => {
    const effects = props.payload.growth.potentials
      .filter((row) => row.upgradeCount === stage)
      .flatMap((row): PotentialEffect[] => {
        if (row.effectType === 4) {
          const percent = new Intl.NumberFormat(locale.value, {
            maximumFractionDigits: 1,
          }).format(row.value / 10)
          return [
            {
              label: t('cardDetail.allStatsUp', { percent }),
              lang: locale.value,
            },
          ]
        }

        const fieldByEffectType: Partial<
          Record<
            number,
            'activeSkill' | 'passiveSkill' | 'specialSkill' | 'connectEffect'
          >
        > = {
          1: 'activeSkill',
          2: 'passiveSkill',
          3: 'specialSkill',
          5: 'connectEffect',
        }
        const field = fieldByEffectType[row.effectType]
        if (!field) return []

        const skill =
          field === 'connectEffect'
            ? connectDescriptions.value.find((item) => item.level === row.value)
            : skillDescriptions.value[field].find(
                (item) => item.level === row.value,
              )
        return [
          {
            label: `${t(`cardList.field.${field}`)} ${t('cardList.skillLevel', { level: row.value })}`,
            description: skill?.text,
            lang: skill?.lang ?? locale.value,
          },
        ]
      })
    const title =
      stage === 0
        ? t('cardDetail.potentialNone')
        : t('cardDetail.potentialStage', { stage })
    const accessibleEffects = effects.map((effect) => {
      if (!effect.description) return effect.label
      const plainDescription = tokenizeSkillText(effect.description)
        .map((part) => part.value)
        .join('')
      return `${effect.label}: ${plainDescription}`
    })
    return {
      stage,
      title,
      summary: [title, ...effects.map((effect) => effect.label)].join(' · '),
      label: [title, ...accessibleEffects].join(' · '),
      effects,
    }
  }),
)
const statKeys: CardStatKey[] = ['performance', 'technique', 'sense']
const levelMinimum = computed(() => Math.min(...levels.value))
const levelMaximum = computed(() => Math.max(...levels.value))
const costumeImageUrl = computed(() =>
  getCostumeThumbnailUrl(costume.value?.assetId ?? null),
)
const {
  status: costumeImageStatus,
  imageElement: costumeImageElement,
  onLoad: onCostumeImageLoad,
  onError: onCostumeImageError,
} = useImageLoading(costumeImageUrl)
function changeLevel(value: unknown) {
  if (typeof value !== 'number') return
  selection.value = selectCardGrowthLevel(props.payload.growth, {
    ...selection.value,
    level: value,
  })
}
function changePotential(value: unknown) {
  if (typeof value !== 'number') return
  selection.value = selectCardGrowthLevel(props.payload.growth, {
    ...selection.value,
    potentialUpgradeCount: value,
  })
}
</script>

<template>
  <article class="mx-auto w-full max-w-[100rem]">
    <Button
      :as="NuxtLink"
      class="mb-2 !min-h-11 !px-2"
      severity="primary"
      text
      size="small"
      :to="buildLocalizedPath(locale as SiteLocale, props.gameLocale, 'cards')"
    >
      <ArrowLeft class="size-5 shrink-0" :stroke-width="2" aria-hidden="true" />
      <span>{{ t('cardDetail.backToCards') }}</span>
    </Button>
    <div class="grid min-w-0 items-start gap-6 lg:grid-cols-[3fr_2fr]">
      <div class="contents lg:block lg:space-y-5 lg:pl-14">
        <CardDetailArtwork
          class="order-0 min-w-0 lg:order-none"
          :card-name="cardName"
          :character-name="characterName"
          :character-asset-id="payload.card.characterAssetId"
          :character-id="payload.card.characterId"
          :game-locale="gameLocale"
          :character-groups="payload.characterGroups"
        >
          <CardListContent
            class="min-w-0"
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
          >
            <template v-if="mediaEnabled && !fullscreenVisible" #image-overlay>
              <CardDetailMedia
                :key="`${payload.card.id}:${mediaVariant}`"
                v-model:animate="animateCard"
                v-model:show-signature="showSignature"
                :asset-id="payload.card.assetId"
                :variant="mediaVariant"
              />
            </template>
          </CardListContent>
          <template #controls>
            <div
              class="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
            >
              <Button
                class="min-h-11"
                text
                size="small"
                @click="fullscreenPlayer?.open()"
              >
                <Maximize class="size-5" :stroke-width="2" aria-hidden="true" />
                <span>{{ t('cardDetail.fullscreen') }}</span>
              </Button>
              <div v-if="mediaEnabled" class="flex flex-wrap gap-x-4 gap-y-1">
                <CardDetailMediaSwitch
                  v-model="animateCard"
                  :label="t('cardDetail.animateCard')"
                  :character-id="payload.card.characterId"
                  :character-asset-id="payload.card.characterAssetId"
                />
                <CardDetailMediaSwitch
                  v-model="showSignature"
                  :label="t('cardDetail.showSignature')"
                  :character-id="payload.card.characterId"
                  :character-asset-id="payload.card.characterAssetId"
                />
              </div>
            </div>
          </template>
        </CardDetailArtwork>

        <div class="order-3 grid min-w-0 gap-4 sm:grid-cols-2 lg:order-none">
          <section v-if="costume && costumeDescription" class="min-w-0">
            <h2
              class="mb-0 flex w-fit items-center gap-2 rounded-t-xl border border-b-0 border-surface-200 bg-primary-50 px-3 pt-2 pb-1 text-sm font-semibold text-color dark:border-surface-700 dark:bg-primary-950"
            >
              <Shirt
                class="size-5 shrink-0"
                :stroke-width="2"
                aria-hidden="true"
              />
              {{ t('cardList.field.costume') }}
            </h2>
            <div
              class="rounded-xl rounded-tl-none border border-surface-200 bg-surface-0 p-3 dark:border-surface-700 dark:bg-surface-900"
            >
              <div class="flex min-w-0 items-start gap-3">
                <div
                  class="relative size-28 shrink-0 overflow-hidden rounded-lg bg-surface-0/70 dark:bg-surface-900/70"
                >
                  <Skeleton
                    v-if="costumeImageUrl && costumeImageStatus === 'loading'"
                    class="image-skeleton absolute inset-0 size-full"
                    width="100%"
                    height="100%"
                    border-radius="0"
                  />
                  <img
                    v-if="costumeImageUrl && costumeImageStatus !== 'failed'"
                    ref="costumeImageElement"
                    :key="costumeImageUrl"
                    :src="costumeImageUrl"
                    alt=""
                    aria-hidden="true"
                    class="size-full object-contain"
                    loading="lazy"
                    decoding="async"
                    @load="onCostumeImageLoad"
                    @error="onCostumeImageError"
                  />
                  <span
                    v-else
                    class="grid size-full place-items-center text-muted-color"
                    aria-hidden="true"
                    ><Shirt class="size-5" :stroke-width="2"
                  /></span>
                </div>
                <div class="min-w-0 flex-1">
                  <p
                    class="mb-2 text-sm font-medium leading-snug wrap-anywhere"
                    :lang="resolveLocalizedName(costume.name, gameLocale).lang"
                  >
                    {{ resolveLocalizedName(costume.name, gameLocale).text }}
                  </p>
                  <p
                    class="mb-0 whitespace-pre-line text-sm leading-relaxed wrap-anywhere"
                    :lang="skillLocale"
                  >
                    <CardListSkillText
                      :text="costumeDescription"
                      :lang="skillLocale"
                    />
                  </p>
                </div>
              </div>
            </div>
          </section>
          <section v-if="connectDescriptions.length" class="min-w-0">
            <h2
              class="mb-0 flex w-fit items-center gap-2 rounded-t-xl border border-b-0 border-surface-200 bg-primary-50 px-3 pt-2 pb-1 text-sm font-semibold text-color dark:border-surface-700 dark:bg-primary-950"
            >
              <Grid2X2
                class="size-5 shrink-0"
                :stroke-width="2"
                aria-hidden="true"
              />
              {{ t('cardList.field.connectEffect') }}
            </h2>
            <div
              class="rounded-xl rounded-tl-none border border-surface-200 bg-surface-0 p-3 dark:border-surface-700 dark:bg-surface-900"
            >
              <div class="flex min-w-0 flex-wrap items-start gap-3">
                <CardListConnectGraph :positions="connectPositions" />
                <div class="grid min-w-0 flex-1 basis-48 gap-2">
                  <div
                    v-for="item in connectDescriptions"
                    :key="item.level"
                    class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3"
                    :class="
                      item.level === growth.skillLevels.connectEffect
                        ? 'text-color'
                        : 'text-surface-700 dark:text-surface-300'
                    "
                    :aria-current="
                      item.level === growth.skillLevels.connectEffect
                        ? 'true'
                        : undefined
                    "
                  >
                    <span
                      class="whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium leading-relaxed"
                      :class="
                        item.level === growth.skillLevels.connectEffect
                          ? 'bg-primary text-primary-contrast'
                          : 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-200'
                      "
                      :lang="locale"
                    >
                      {{ t('cardList.skillLevel', { level: item.level }) }}
                    </span>
                    <p
                      class="mb-0 min-w-0 whitespace-pre-line text-sm leading-relaxed wrap-anywhere"
                      :lang="item.lang"
                    >
                      <CardListSkillText :text="item.text" :lang="item.lang" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div class="contents lg:block lg:space-y-5">
        <section
          class="order-2 min-w-0 rounded-2xl border border-surface-200 bg-surface-0 p-4 shadow-sm dark:border-surface-700 dark:bg-surface-900 lg:order-none"
          :aria-labelledby="`card-detail-level-label`"
        >
          <div class="grid grid-cols-2 gap-x-5 gap-y-4">
            <label class="col-span-2 grid min-w-0 gap-2 text-sm">
              <span
                :id="`card-detail-level-label`"
                class="flex justify-between gap-2"
              >
                <span>{{ t('cardDetail.level') }}</span>
                <span
                  class="whitespace-nowrap text-right font-semibold tabular-nums"
                  >{{
                    t('cardDetail.levelSummary', {
                      level: normalizedSelection.level,
                      limit: currentLevelLimit,
                      training: normalizedSelection.limitBreakCount,
                    })
                  }}</span
                >
              </span>
              <div class="growth-slider-control flex min-h-11 items-center">
                <Slider
                  :model-value="normalizedSelection.level"
                  :min="levelMinimum"
                  :max="levelMaximum"
                  :step="1"
                  :aria-labelledby="`card-detail-level-label`"
                  class="w-full touch-pan-y"
                  @update:model-value="changeLevel"
                />
              </div>
              <span
                class="flex justify-between text-xs text-muted-color"
                aria-hidden="true"
                ><span>{{ levelMinimum }}</span
                ><span>{{ levelMaximum }}</span></span
              >
            </label>
            <label class="col-span-2 grid min-w-0 gap-2 text-sm">
              <span
                id="card-detail-potential-label"
                class="flex items-center gap-2"
              >
                <span>{{ t('cardDetail.potential') }}</span>
              </span>
              <Select
                :model-value="normalizedSelection.potentialUpgradeCount"
                :options="potentialOptions"
                option-label="label"
                option-value="stage"
                input-id="card-detail-potential-select"
                aria-labelledby="card-detail-potential-label"
                class="w-full"
                @update:model-value="changePotential"
              >
                <template #value="slotProps">
                  <div
                    v-if="slotProps.value !== undefined"
                    class="min-w-0 py-1"
                  >
                    <div class="font-medium leading-snug">
                      {{
                        potentialOptions.find(
                          (option) => option.stage === slotProps.value,
                        )?.summary
                      }}
                    </div>
                  </div>
                  <span v-else>{{ slotProps.placeholder }}</span>
                </template>
                <template #option="slotProps">
                  <div class="min-w-0 py-1 wrap-anywhere">
                    <div
                      class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 leading-snug"
                    >
                      <span class="font-medium">{{
                        slotProps.option.title
                      }}</span>
                      <span
                        v-for="effect in slotProps.option.effects"
                        :key="effect.label"
                        class="text-xs text-muted-color"
                      >
                        {{ effect.label }}
                      </span>
                    </div>
                    <template
                      v-for="effect in slotProps.option.effects"
                      :key="effect.label"
                    >
                      <div
                        v-if="effect.description"
                        class="mt-1 min-w-0 whitespace-normal text-sm leading-snug wrap-anywhere"
                      >
                        <CardListSkillText
                          :text="effect.description"
                          :lang="effect.lang"
                        />
                      </div>
                    </template>
                  </div>
                </template>
              </Select>
            </label>
          </div>
          <div
            class="mt-3 border-t border-surface-200 pt-3 dark:border-surface-700"
            aria-live="polite"
            aria-atomic="true"
          >
            <CardDetailParameters
              class="min-w-0 text-base"
              :stats="growth.stats"
              :total="growth.total"
              :specializations="growth.specializations"
              :stat-keys="statKeys"
            />
          </div>
        </section>

        <section
          class="order-4 min-w-0 rounded-2xl border border-surface-200 bg-surface-0 p-4 shadow-sm dark:border-surface-700 dark:bg-surface-900 sm:p-5 lg:order-none"
        >
          <CardDetailSkill
            v-if="skillDescriptions.specialSkill.length"
            kind="specialSkill"
            :title="t('cardList.field.specialSkill')"
            :rows="skillDescriptions.specialSkill"
            :current-level="growth.skillLevels.specialSkill"
          />
          <div
            v-if="
              skillDescriptions.specialSkill.length &&
              skillDescriptions.activeSkill.length
            "
            class="border-t border-surface-200 dark:border-surface-700"
          />
          <CardDetailSkill
            v-if="skillDescriptions.activeSkill.length"
            kind="activeSkill"
            :title="t('cardList.field.activeSkill')"
            :rows="skillDescriptions.activeSkill"
            :current-level="growth.skillLevels.activeSkill"
          />
          <div
            v-if="
              skillDescriptions.activeSkill.length &&
              skillDescriptions.passiveSkill.length
            "
            class="border-t border-surface-200 dark:border-surface-700"
          />
          <CardDetailSkill
            v-if="skillDescriptions.passiveSkill.length"
            kind="passiveSkill"
            :title="t('cardList.field.passiveSkill')"
            :rows="skillDescriptions.passiveSkill"
            :current-level="growth.skillLevels.passiveSkill"
          />
        </section>
      </div>
    </div>
    <CardDetailFullscreen
      ref="fullscreenPlayer"
      v-model:visible="fullscreenVisible"
      v-model:animate="animateCard"
      v-model:show-signature="showSignature"
      :asset-id="payload.card.assetId"
      :voice-asset-id="payload.voiceAssetId"
      :animated="mediaEnabled"
      :variant="mediaVariant"
      :card-name="cardName"
      :character-id="payload.card.characterId"
      :character-asset-id="payload.card.characterAssetId"
    />
  </article>
</template>

<style scoped>
/* PrimeVue uses ::before for the handle graphic; ::after expands its touch target. */
.growth-slider-control :deep(.p-slider-handle)::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: transparent;
  content: '';
  pointer-events: auto;
  transform: translate(-50%, -50%);
}
</style>
