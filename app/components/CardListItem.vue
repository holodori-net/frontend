<script setup lang="ts">
import { resolveLocalizedName, type GameLocale } from '#shared/language'
import type {
  CardListItemData,
  CardStatKey,
} from '#shared/game-data/card-list-data'
import {
  getCardAttributeIconUrl,
  getCardStatIconUrl,
} from '#shared/game-data/card-icons'
import {
  getCardImageUrl,
  CARD_LIST_FIELDS,
  type CardListField,
  type CardListLayout,
} from '#shared/game-data/card-list'

const props = withDefaults(
  defineProps<{
    card: CardListItemData
    gameLocale: GameLocale
    statKeys: CardStatKey[]
    fields?: readonly CardListField[]
    layout?: CardListLayout
  }>(),
  { fields: () => CARD_LIST_FIELDS, layout: 'full' },
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
const showCardName = computed(() => props.fields.includes('name'))
const showCharacterName = computed(() => props.fields.includes('characterName'))
const showParameters = computed(() => props.fields.includes('parameters'))
const hasInformation = computed(
  () => showCardName.value || showCharacterName.value || showParameters.value,
)
const informationHeight = computed(() => {
  if (!hasInformation.value) return '0rem'
  if (showCardName.value && showCharacterName.value && showParameters.value)
    return '12rem'

  let height = 2
  if (showCardName.value) height += 2.5
  if (showCharacterName.value) height += 2
  if (showParameters.value) height += 5
  if (showParameters.value && (showCardName.value || showCharacterName.value))
    height += 1
  return `${height}rem`
})
const articleStyle = computed(() => ({
  '--card-list-info-height': informationHeight.value,
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
  <li class="card-list-container block min-w-0">
    <article
      class="card-list-content flex h-full min-w-0 overflow-hidden rounded-2xl border border-surface-200 bg-surface-0 shadow-sm dark:border-surface-700 dark:bg-surface-900"
      :class="[
        layout === 'vertical' &&
          hasInformation &&
          'flex-row items-start card-list-content--vertical',
        layout === 'vertical' &&
          !hasInformation &&
          'flex-col card-list-content--art-only-vertical',
        layout === 'full' && 'flex-col',
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
        class="relative overflow-hidden bg-surface-100 dark:bg-surface-800"
        :class="
          layout === 'vertical' && hasInformation
            ? 'aspect-[256/366] w-[40%] min-w-28 max-w-40 shrink-0'
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
        class="flex flex-1 flex-col"
        :class="
          layout === 'vertical' ? 'min-w-0 self-stretch gap-2 p-3' : 'gap-4 p-4'
        "
      >
        <div v-if="showCardName || showCharacterName" class="min-w-0 flex-1">
          <p
            v-if="showCardName"
            class="game-text mb-0 min-w-0 text-base font-semibold leading-snug wrap-anywhere"
            :lang="cardName.lang"
          >
            {{ cardName.text }}
          </p>
          <p
            v-if="showCharacterName"
            class="game-text mb-0 text-sm text-muted-color wrap-anywhere"
            :class="showCardName && 'mt-1'"
            :lang="characterName.lang"
          >
            {{ characterName.text }}
          </p>
        </div>

        <dl
          v-if="showParameters"
          class="mt-auto min-w-0 text-base"
          :class="
            layout === 'vertical'
              ? 'grid grid-cols-1 gap-y-1'
              : 'flex flex-wrap items-center justify-center gap-x-1 gap-y-1'
          "
        >
          <div
            v-for="stat in statKeys"
            :key="stat"
            class="min-w-0 max-w-full items-center gap-1 py-1"
            :class="
              layout === 'vertical' ? 'flex' : 'inline-flex flex-[0_1_auto]'
            "
          >
            <span
              v-if="layout !== 'vertical' && stat !== statKeys[0]"
              aria-hidden="true"
              class="mx-1 shrink-0"
              >+</span
            >
            <dt class="sr-only">
              {{ t(`cardList.stat.${stat}`) }}
            </dt>
            <dd
              class="m-0 inline-flex min-w-0 items-center gap-1 font-medium tabular-nums"
              :class="layout === 'vertical' && 'flex-wrap'"
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
                :class="card.specializations.includes(stat) && 'text-primary'"
              >
                {{ numberFormatter.format(card.stats[stat]) }}
              </span>
            </dd>
          </div>
          <div
            class="min-w-0 max-w-full items-center gap-1 py-1"
            :class="
              layout === 'vertical'
                ? 'flex border-t border-surface-200 pt-1 dark:border-surface-700'
                : 'inline-flex flex-[0_1_auto]'
            "
          >
            <span
              v-if="layout !== 'vertical'"
              aria-hidden="true"
              class="mx-1 shrink-0"
              >=</span
            >
            <dt
              :class="
                layout === 'vertical' ? 'text-xs text-muted-color' : 'sr-only'
              "
            >
              {{ t('cardList.total') }}
            </dt>
            <dd
              class="m-0 inline-flex min-w-0 items-center gap-1 font-bold tabular-nums"
              :class="layout === 'vertical' && 'flex-wrap'"
            >
              <span>
                {{ numberFormatter.format(card.total) }}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </article>
  </li>
</template>

<style scoped>
.card-list-container {
  container-type: inline-size;
}

.card-list-content {
  content-visibility: auto;
  contain-intrinsic-block-size: auto 24rem;
  contain-intrinsic-block-size: auto
    calc(56.25cqw + var(--card-list-info-height, 12rem));
}

.card-list-content--vertical {
  contain-intrinsic-block-size: auto max(57.19cqw, 12rem);
}

.card-list-content--art-only-full {
  contain-intrinsic-block-size: auto 56.25cqw;
}

.card-list-content--art-only-vertical {
  contain-intrinsic-block-size: auto 142.97cqw;
}

@media (prefers-reduced-motion: reduce) {
  .card-image-skeleton::after {
    animation: none;
  }
}
</style>
