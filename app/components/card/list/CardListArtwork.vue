<script setup lang="ts">
import type { CardListLayout } from '#shared/game-data/cards/display'
import { getCardAttributeIconUrl } from '~/utils/card-icons'
import { getCardImageUrl } from '#shared/game-data/cards/assets'

const props = withDefaults(
  defineProps<{
    assetId: string | null
    attributeType: number
    rarity: number
    layout?: CardListLayout
    imageSize?: 'thumbnail' | 'original'
    hasInformation?: boolean
  }>(),
  { layout: 'full', imageSize: 'thumbnail', hasInformation: true },
)

const { t } = useI18n()
const imageUrl = computed(() =>
  getCardImageUrl(props.assetId, props.layout, props.imageSize),
)
const { status, imageElement, onLoad, onError } = useImageLoading(imageUrl)
const hasImage = computed(
  () => Boolean(imageUrl.value) && status.value !== 'failed',
)
</script>

<template>
  <div
    class="card-list-art relative overflow-hidden bg-surface-100 dark:bg-surface-800"
    :class="[
      layout === 'vertical' && hasInformation
        ? 'aspect-[256/366] w-24 shrink-0'
        : layout === 'vertical'
          ? 'aspect-[256/366] w-full'
          : 'aspect-video w-full',
    ]"
  >
    <Skeleton
      v-if="hasImage && status === 'loading'"
      class="card-image-skeleton inset-0"
      style="position: absolute"
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
      @load="onLoad"
      @error="onError"
    />
    <span
      v-else
      class="absolute inset-0 grid place-items-center px-3 text-center text-xs text-muted-color"
    >
      {{ t('cardList.imageUnavailable') }}
    </span>

    <slot />

    <div class="absolute left-1 top-1">
      <CardListIcon
        :src="getCardAttributeIconUrl(attributeType)"
        :label="t(`cardList.attribute${attributeType}`)"
        size="large"
      />
    </div>
    <div class="absolute bottom-1 left-1 top-11">
      <CardListRarity
        :count="rarity"
        :label="t('cardList.rarityOption', { count: rarity })"
        vertical
      />
    </div>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .card-image-skeleton::after {
    animation: none;
  }
}
</style>
