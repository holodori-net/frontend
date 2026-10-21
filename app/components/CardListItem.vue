<script setup lang="ts">
import {
  gameLocaleLanguages,
  resolveLocalizedName,
  type GameLocale,
} from '#shared/language'
import type {
  CardListCostumeData,
  CardListConnectEffectLevelData,
  CardListItemData,
  CardListSkillData,
  CardStatKey,
} from '#shared/game-data/card-list-data'
import type { ConnectPosition } from '#shared/game-data/skill-tree-connect-effects'
import {
  composeActiveSkillDescription,
  composeCostumeSkillDescription,
  composePassiveSkillDescription,
  composeSpecialSkillDescription,
} from '#shared/game-data/live-skill-description'
import {
  getCardAttributeIconUrl,
  getCardStatIconUrl,
} from '#shared/game-data/card-icons'
import {
  getCardImageUrl,
  CARD_LIST_FIELDS,
  getCardListFieldGroups,
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

const { t, locale } = useI18n()
const imageFailed = ref(false)
const imageLoaded = ref(false)
const imageElement = ref<HTMLImageElement | null>(null)
const imageUrl = computed(() =>
  getCardImageUrl(props.card.assetId, props.layout),
)
const numberFormatter = computed(() => new Intl.NumberFormat(locale.value))
const hasImage = computed(() => Boolean(imageUrl.value) && !imageFailed.value)
const cardName = computed(() =>
  resolveLocalizedName(props.card.name, props.gameLocale),
)
const skillLocale = computed(() => gameLocaleLanguages[props.gameLocale])
function describeSkillLevel(level: number, text: string | null) {
  return {
    level,
    text: text ?? t('cardList.skillUnavailable'),
    lang: text === null ? locale.value : skillLocale.value,
  }
}
const skillDescriptions = computed(() => ({
  passiveSkill: (
    props.skills.passiveSkills[props.card.livePassiveSkillId] ?? []
  )
    .filter((level) => props.skillLevels.passiveSkill.includes(level.level))
    .map((level) =>
      describeSkillLevel(
        level.level,
        composePassiveSkillDescription(
          level,
          props.skills,
          props.gameLocale,
          undefined,
          'display',
        ),
      ),
    ),
  activeSkill: (props.skills.activeSkills[props.card.liveActiveSkillId] ?? [])
    .filter((level) => props.skillLevels.activeSkill.includes(level.level))
    .map((level) =>
      describeSkillLevel(
        level.level,
        composeActiveSkillDescription(
          level,
          props.skills,
          props.gameLocale,
          undefined,
          'display',
        ),
      ),
    ),
  specialSkill: (
    props.skills.specialSkills[props.card.liveSpecialSkillId] ?? []
  )
    .filter((level) => props.skillLevels.specialSkill.includes(level.level))
    .map((level) =>
      describeSkillLevel(
        level.level,
        composeSpecialSkillDescription(
          level,
          props.skills,
          props.gameLocale,
          undefined,
          'display',
        ),
      ),
    ),
}))
const fullSubgridStyle = computed(() => {
  if (props.layout !== 'full') return {}

  const style: Record<string, string> = {
    '--card-list-row-span': String(1 + props.fields.length),
  }
  props.fields.forEach((field, index) => {
    style[`--card-list-field-${field}-row`] = String(index + 1)
  })
  return style
})
const hasInformation = computed(() => props.fields.length > 0)
const fieldGroups = computed(() => getCardListFieldGroups(props.fields))
const costume = computed(() =>
  props.card.costumeId ? props.costumes[props.card.costumeId] : undefined,
)
const costumeName = computed(() =>
  costume.value
    ? resolveLocalizedName(costume.value.name, props.gameLocale)
    : null,
)
const costumeDescription = computed(() => {
  if (!costume.value) return null
  if (!costume.value.leaderSkillId) {
    return {
      text: t('cardList.noLeaderSkill'),
      lang: locale.value,
    }
  }
  const skill = props.skills.leaderSkills[costume.value.leaderSkillId]
  const text = skill
    ? composeCostumeSkillDescription(skill, props.skills, props.gameLocale)
    : null
  return {
    text: text ?? t('cardList.skillUnavailable'),
    lang: text === null ? locale.value : gameLocaleLanguages[props.gameLocale],
  }
})
const connectEffectLevels = computed(() => {
  const effectId = props.card.skillTreeConnectEffectId
  if (!effectId) return []
  return (props.connectEffects[effectId] ?? [])
    .filter((effect) => props.skillLevels.connectEffect.includes(effect.level))
    .sort((left, right) => left.level - right.level)
})
const connectPositions = computed(() => {
  const extentGroupId = connectEffectLevels.value[0]?.extentGroupId
  return extentGroupId ? (props.connectExtents[extentGroupId] ?? []) : []
})
const informationHeight = computed(() => {
  if (!hasInformation.value) return '0rem'
  let height = 2
  for (const field of props.fields) {
    if (field === 'name') height += 2.5
    else if (field === 'characterName') height += 2
    else if (field === 'parameters') height += 5
    else if (field === 'costume' && costume.value) height += 8
    else if (field === 'connectEffect' && connectEffectLevels.value.length)
      height += 8 + connectEffectLevels.value.length * 4
    else if (isSkillField(field)) {
      const displayedCount = skillDescriptions.value[field].length
      height += displayedCount ? 4 + displayedCount * 4 : 0
    }
  }
  return `${height}rem`
})
function isSkillField(
  field: CardListField,
): field is Exclude<CardSkillField, 'connectEffect'> {
  return (
    field === 'passiveSkill' ||
    field === 'activeSkill' ||
    field === 'specialSkill'
  )
}
function fieldClass() {
  return ['min-w-0', props.layout === 'full' && 'card-list-field-row']
}
function fieldStyle(field: CardListField) {
  return props.layout === 'full'
    ? { gridRow: `var(--card-list-field-${field}-row)` }
    : undefined
}
function fieldGroupStyle(groupIndex: number) {
  return props.layout === 'vertical'
    ? { gridColumn: `${groupIndex + 1}`, gridRow: '1' }
    : undefined
}
function displayedSkillLevels(field: CardSkillField) {
  if (field === 'connectEffect') return []
  return skillDescriptions.value[field]
}
const articleStyle = computed(() => ({
  '--card-list-info-height': informationHeight.value,
  '--card-list-field-count': String(fieldGroups.value.length),
}))
const characterName = computed(() =>
  resolveLocalizedName(props.card.characterName, props.gameLocale),
)
function settleCompletedImage() {
  const image = imageElement.value
  if (!image?.complete) return
  if (image.naturalWidth > 0) imageLoaded.value = true
  else imageFailed.value = true
}

watch([() => props.card.id, imageUrl], async () => {
  imageFailed.value = false
  imageLoaded.value = false
  await nextTick()
  settleCompletedImage()
})

onMounted(() => {
  settleCompletedImage()
})
</script>

<template>
  <li
    class="card-list-container block min-w-0"
    :class="[
      layout === 'full' && 'card-list-container--full-subgrid',
      layout === 'vertical' &&
        !hasInformation &&
        'card-list-container--art-only-vertical',
    ]"
    :style="fullSubgridStyle"
  >
    <article
      class="card-list-content h-full min-w-0 overflow-hidden rounded-2xl border border-surface-200 bg-surface-0 shadow-sm dark:border-surface-700 dark:bg-surface-900"
      :class="[
        layout === 'vertical' &&
          hasInformation &&
          'grid grid-cols-[6rem_minmax(0,1fr)] items-start card-list-content--vertical',
        layout === 'vertical' &&
          !hasInformation &&
          'flex flex-col card-list-content--art-only-vertical',
        layout === 'full' && 'card-list-content--full-subgrid',
        !hasInformation &&
          layout === 'full' &&
          'card-list-content--art-only-full',
      ]"
      :style="articleStyle"
      :aria-labelledby="`card-name-${card.id}`"
    >
      <span :id="`card-name-${card.id}`" class="sr-only" :lang="cardName.lang">
        {{ cardName.text }}
      </span>
      <div
        class="card-list-art relative overflow-hidden bg-surface-100 dark:bg-surface-800"
        :class="
          layout === 'vertical' && hasInformation
            ? 'aspect-[256/366] w-24 shrink-0'
            : layout === 'vertical'
              ? 'aspect-[256/366] w-full'
              : 'aspect-video w-full'
        "
      >
        <Skeleton
          v-if="hasImage && !imageLoaded"
          class="card-image-skeleton absolute inset-0"
          width="100%"
          height="100%"
          border-radius="0"
        />
        <img
          v-if="hasImage"
          ref="imageElement"
          :key="imageUrl!"
          :src="imageUrl!"
          alt=""
          class="relative size-full object-contain"
          draggable="false"
          loading="lazy"
          decoding="async"
          @load="imageLoaded = true"
          @error="imageFailed = true"
        />
        <span
          v-else
          class="absolute inset-0 grid place-items-center px-3 text-center text-xs text-muted-color"
        >
          {{ t('cardList.imageUnavailable') }}
        </span>

        <div class="absolute left-1 top-1">
          <CardListIcon
            :src="getCardAttributeIconUrl(card.attributeType)"
            :label="t(`cardList.attribute${card.attributeType}`)"
            size="large"
          />
        </div>
        <div class="absolute bottom-1 left-1 top-11">
          <CardListRarity
            :count="card.rarity"
            :label="t('cardList.rarityOption', { count: card.rarity })"
            vertical
          />
        </div>
      </div>

      <div
        v-if="hasInformation"
        class="min-w-0"
        :class="
          layout === 'full'
            ? 'card-list-info--full-subgrid'
            : 'card-list-info--vertical grid content-start items-start gap-x-4 gap-y-2 p-3'
        "
      >
        <div
          v-for="(group, groupIndex) in fieldGroups"
          :key="group.key"
          :class="
            layout === 'full'
              ? 'card-list-field-group--full'
              : 'card-list-field-group--vertical'
          "
          :style="fieldGroupStyle(groupIndex)"
        >
          <template v-for="field in group.fields" :key="field">
            <p
              v-if="field === 'name'"
              class="mb-0 min-w-0 text-base font-semibold leading-snug wrap-anywhere"
              :class="fieldClass()"
              :style="fieldStyle(field)"
              :lang="cardName.lang"
            >
              {{ cardName.text }}
            </p>
            <p
              v-else-if="field === 'characterName'"
              class="mb-0 text-sm text-muted-color wrap-anywhere"
              :class="fieldClass()"
              :style="fieldStyle(field)"
              :lang="characterName.lang"
            >
              {{ characterName.text }}
            </p>

            <dl
              v-else-if="field === 'parameters'"
              class="min-w-0 text-base"
              :class="[
                fieldClass(),
                'card-list-parameters-row flex flex-wrap items-center justify-center gap-x-1 gap-y-1',
              ]"
              :style="fieldStyle(field)"
            >
              <div
                v-for="stat in statKeys"
                :key="stat"
                class="inline-flex min-w-0 max-w-full flex-[0_1_auto] items-center gap-1 py-1"
              >
                <span
                  v-if="stat !== statKeys[0]"
                  aria-hidden="true"
                  class="mx-1 shrink-0"
                  >+</span
                >
                <dt class="sr-only">
                  {{ t(`cardList.stat.${stat}`) }}
                </dt>
                <dd
                  class="m-0 inline-flex min-w-0 items-center gap-1 font-medium tabular-nums"
                >
                  <CardListIcon
                    :src="getCardStatIconUrl(stat)"
                    :label="t(`cardList.stat.${stat}`)"
                    aria-hidden="true"
                    monochrome
                    size="small"
                  />
                  <span
                    class="ml-px text-sm"
                    :class="
                      card.specializations.includes(stat) && 'text-primary'
                    "
                  >
                    {{ numberFormatter.format(card.stats[stat]) }}
                  </span>
                </dd>
              </div>
              <div
                class="inline-flex min-w-0 max-w-full flex-[0_1_auto] items-center gap-1 py-1"
              >
                <span aria-hidden="true" class="mx-1 shrink-0">=</span>
                <dt class="sr-only">
                  {{ t('cardList.total') }}
                </dt>
                <dd
                  class="m-0 inline-flex min-w-0 items-center gap-1 font-bold tabular-nums"
                >
                  <span>
                    {{ numberFormatter.format(card.total) }}
                  </span>
                </dd>
              </div>
            </dl>

            <CardListSkillSection
              v-else-if="
                isSkillField(field) && displayedSkillLevels(field).length
              "
              :class="fieldClass()"
              :style="fieldStyle(field)"
              :title="t(`cardList.field.${field}`)"
              :levels="displayedSkillLevels(field)"
            />

            <CardListConnectSection
              v-else-if="
                field === 'connectEffect' && connectEffectLevels.length
              "
              :class="fieldClass()"
              :style="fieldStyle(field)"
              :title="t('cardList.field.connectEffect')"
              :game-locale="gameLocale"
              :levels="connectEffectLevels"
              :positions="connectPositions"
            />

            <section
              v-else-if="
                field === 'costume' &&
                costume &&
                costumeName &&
                costumeDescription
              "
              class="min-w-0"
              :class="fieldClass()"
              :style="fieldStyle(field)"
            >
              <Divider
                align="left"
                role="presentation"
                :aria-orientation="null"
                class="my-2 min-w-0"
                :pt="{ content: { class: 'min-w-0 max-w-full' } }"
              >
                <h3
                  class="m-0 min-w-0 max-w-full text-sm font-semibold leading-snug wrap-anywhere"
                >
                  <span>{{ t('cardList.field.costume') }}</span>
                  <span
                    class="ml-1 text-xs font-normal text-muted-color wrap-anywhere"
                    :lang="costumeName.lang"
                  >
                    {{ costumeName.text }}
                  </span>
                </h3>
              </Divider>
              <p class="mb-0 text-sm leading-relaxed">
                <CardListSkillText
                  :text="costumeDescription.text"
                  :lang="costumeDescription.lang"
                />
              </p>
            </section>
          </template>
        </div>
      </div>
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

.card-list-content {
  content-visibility: auto;
  contain-intrinsic-block-size: auto 24rem;
  contain-intrinsic-block-size: auto
    calc(56.25cqw + var(--card-list-info-height, 12rem));
}

.card-list-content--vertical {
  contain-intrinsic-block-size: auto 24rem;
}

.card-list-info--vertical {
  grid-template-columns: repeat(
    var(--card-list-field-count),
    minmax(12rem, 1fr)
  );
}

.card-list-field-group--full {
  display: contents;
}

.card-list-field-group--vertical {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.5rem;
  align-self: stretch;
  grid-row: 1;
}

.card-list-content--full-subgrid {
  display: grid;
  grid-row: 1 / -1;
  grid-template-rows: subgrid;
  content-visibility: visible;
  contain-intrinsic-block-size: none;
}

.card-list-art {
  grid-row: 1;
}

.card-list-info--full-subgrid {
  display: grid;
  grid-row: 2 / -1;
  grid-template-rows: subgrid;
  row-gap: 0.2rem;
  align-items: start;
  min-width: 0;
  padding: 1rem;
}

.card-list-parameters-row {
  margin-top: 0;
}
.card-list-field-row {
  min-width: 0;
}

.card-list-content--art-only-full {
  contain-intrinsic-block-size: auto 56.25cqw;
}

.card-list-content--art-only-vertical {
  contain-intrinsic-block-size: auto 142.97cqw;
}

.card-list-content--art-only-full.card-list-content--full-subgrid {
  contain-intrinsic-block-size: none;
}

@media (prefers-reduced-motion: reduce) {
  .card-image-skeleton::after {
    animation: none;
  }
}
</style>
