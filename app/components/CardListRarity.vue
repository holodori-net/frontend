<script setup lang="ts">
import { cardRarityStaticUrl } from '#shared/game-data/card-icons'

const props = defineProps<{
  count: number
  label: string
  showLabel?: boolean
  vertical?: boolean
  loadingSkeleton?: boolean
}>()

const rootElement = ref<HTMLElement | null>(null)
const spriteSheetUrl = ref<string>()
const animationActive = computed(() => spriteSheetUrl.value !== undefined)
const staticImageState = ref<'loading' | 'loaded' | 'failed'>('loading')
const showTextFallback = computed(
  () => staticImageState.value === 'failed' && !animationActive.value,
)
const starIndexes = computed(() =>
  Array.from(
    { length: props.vertical || props.showLabel ? props.count : 1 },
    (_, index) => index,
  ),
)

useCardRarityAnimation(rootElement, (url) => {
  spriteSheetUrl.value = url
})

onMounted(async () => {
  await nextTick()
  const image = rootElement.value?.querySelector('img')
  if (image?.complete) {
    setStaticImageState(image.naturalWidth > 0 ? 'loaded' : 'failed')
  }
})

function setStaticImageState(state: 'loaded' | 'failed') {
  staticImageState.value = state
}

function onStaticImageLoad(event: Event) {
  const image = event.currentTarget as HTMLImageElement
  if (image.getAttribute('src') === cardRarityStaticUrl) {
    setStaticImageState('loaded')
  }
}

function onStaticImageError(event: Event) {
  const image = event.currentTarget as HTMLImageElement
  if (image.getAttribute('src') === cardRarityStaticUrl) {
    setStaticImageState('failed')
  }
}
</script>

<template>
  <span
    ref="rootElement"
    class="inline-flex min-w-0 items-center"
    :class="
      vertical
        ? 'relative h-full w-max flex-col justify-end'
        : showLabel
          ? 'gap-2'
          : 'gap-1'
    "
    role="img"
    :aria-label="label"
    :title="label"
  >
    <span
      v-if="showTextFallback"
      :class="[
        !(showLabel && !vertical) && 'text-xs leading-tight',
        vertical && 'absolute bottom-0 left-0',
        vertical &&
          'max-w-44 rounded-md bg-surface-0/90 px-2 py-1 font-medium text-color shadow-sm dark:bg-surface-900/90',
      ]"
    >
      {{ label }}
    </span>
    <span
      v-for="index in starIndexes"
      :key="index"
      class="relative inline-flex items-center justify-center"
      :class="[
        vertical
          ? 'h-7 max-h-7 min-h-0 w-7 shrink -mt-1.5 first:mt-0'
          : 'size-5 shrink-0',
        !vertical && index > 0 && '-ml-3.5',
        showTextFallback && 'invisible',
      ]"
    >
      <span class="relative aspect-square h-full max-w-full overflow-hidden">
        <Skeleton
          v-if="
            loadingSkeleton &&
            !animationActive &&
            staticImageState === 'loading'
          "
          class="image-skeleton !absolute inset-0"
          width="100%"
          height="100%"
          border-radius="50%"
        />
        <img
          :src="cardRarityStaticUrl"
          alt=""
          aria-hidden="true"
          class="absolute object-fill"
          :class="animationActive && 'invisible'"
          :style="{
            left: '0.5%',
            top: '2.5%',
            width: '99%',
            height: '94.5%',
          }"
          draggable="false"
          @load="onStaticImageLoad"
          @error="onStaticImageError"
        />
        <span
          v-if="spriteSheetUrl"
          aria-hidden="true"
          class="card-rarity-sprite absolute inset-0"
          :style="{ backgroundImage: `url(${spriteSheetUrl})` }"
        />
      </span>
    </span>
    <span
      v-if="showLabel && !showTextFallback"
      :class="vertical && 'text-xs leading-tight'"
    >
      {{ label }}
    </span>
    <span
      v-else-if="!vertical && !showTextFallback"
      class="text-xs font-semibold tabular-nums"
    >
      {{ count }}
    </span>
  </span>
</template>
