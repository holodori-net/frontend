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
import { getCardImageUrl } from '#shared/game-data/card-list'

const props = defineProps<{
  card: CardListItemData
  gameLocale: GameLocale
  statKeys: CardStatKey[]
}>()

const { t, locale } = useI18n()
const imageFailed = ref(false)
const imageLoaded = ref(false)
const imageElement = ref<HTMLImageElement | null>(null)
const imageUrl = computed(() => getCardImageUrl(props.card.assetId))
const numberFormatter = computed(() => new Intl.NumberFormat(locale.value))
const hasImage = computed(() => Boolean(imageUrl.value) && !imageFailed.value)
const cardName = computed(() =>
  resolveLocalizedName(props.card.name, props.gameLocale),
)
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
  <li class="min-w-0">
    <article
      class="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-surface-200 bg-surface-0 shadow-sm dark:border-surface-700 dark:bg-surface-900"
    >
      <div
        class="relative aspect-video w-full overflow-hidden bg-surface-100 dark:bg-surface-800"
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

      <div class="flex flex-1 flex-col gap-4 p-4">
        <div class="min-w-0 flex-1">
          <p
            class="mb-0 min-w-0 text-base font-semibold leading-snug wrap-anywhere"
            :lang="cardName.lang"
          >
            {{ cardName.text }}
          </p>
          <p
            class="mb-0 mt-1 text-sm text-muted-color wrap-anywhere"
            :lang="characterName.lang"
          >
            {{ characterName.text }}
          </p>
        </div>

        <dl
          class="mt-auto flex min-w-0 flex-wrap items-center justify-center gap-x-1 gap-y-1 text-base"
        >
          <div
            v-for="stat in statKeys"
            :key="stat"
            class="inline-flex min-w-0 max-w-full flex-[0_1_auto] items-center gap-1 py-1"
          >
            <dt class="sr-only">
              {{ t(`cardList.stat.${stat}`) }}
            </dt>
            <dd
              class="m-0 inline-flex min-w-0 items-center gap-1 font-medium tabular-nums"
            >
              <span
                v-if="stat !== statKeys[0]"
                aria-hidden="true"
                class="mx-1 shrink-0"
                >+</span
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
            class="inline-flex min-w-0 max-w-full flex-[0_1_auto] items-center gap-1 py-1"
          >
            <dt class="sr-only">
              {{ t('cardList.total') }}
            </dt>
            <dd
              class="m-0 inline-flex min-w-0 items-center gap-1 font-bold tabular-nums"
            >
              <span aria-hidden="true" class="mx-1 shrink-0">=</span>
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
@media (prefers-reduced-motion: reduce) {
  .card-image-skeleton::after {
    animation: none;
  }
}
</style>
