<script setup lang="ts">
import { cardRarityStaticUrl } from '#shared/game-data/card-icons'

const props = defineProps<{
  count: number
  label: string
  showLabel?: boolean
  vertical?: boolean
  loadingSkeleton?: boolean
}>()

const canvasElements = ref<HTMLCanvasElement[]>([])
const staticImages = ref<HTMLImageElement[]>([])
const animatedIndexes = ref(new Set<number>())
const staticImageStates = ref(
  new Map<number, 'loading' | 'loaded' | 'failed'>(),
)
const staticImageFailed = ref(false)
const showTextFallback = computed(
  () => staticImageFailed.value && animatedIndexes.value.size === 0,
)
const starIndexes = computed(() =>
  Array.from({ length: props.vertical ? props.count : 1 }, (_, index) => index),
)

useCardRarityAnimation(canvasElements, (index, active) => {
  const indexes = new Set(animatedIndexes.value)
  if (active) indexes.add(index)
  else indexes.delete(index)
  animatedIndexes.value = indexes
})

onMounted(async () => {
  await nextTick()
  staticImages.value.forEach((image, index) => {
    if (!image.complete) return
    setStaticImageState(index, image.naturalWidth > 0 ? 'loaded' : 'failed')
  })
})

function setStaticImageState(index: number, state: 'loaded' | 'failed') {
  const states = new Map(staticImageStates.value)
  states.set(index, state)
  staticImageStates.value = states
  if (state === 'failed') staticImageFailed.value = true
}

function onStaticImageLoad(index: number, event: Event) {
  const image = event.currentTarget as HTMLImageElement
  if (image.getAttribute('src') === cardRarityStaticUrl) {
    setStaticImageState(index, 'loaded')
  }
}

function onStaticImageError(index: number, event: Event) {
  const image = event.currentTarget as HTMLImageElement
  if (image.getAttribute('src') === cardRarityStaticUrl) {
    setStaticImageState(index, 'failed')
  }
}
</script>

<template>
  <span
    class="inline-flex min-w-0 items-center"
    :class="
      vertical ? 'relative h-full w-max flex-col justify-end gap-0.5' : 'gap-1'
    "
    role="img"
    :aria-label="label"
    :title="label"
  >
    <span
      v-if="showTextFallback"
      class="text-xs leading-tight"
      :class="[
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
        vertical ? 'h-7 max-h-7 min-h-0 w-7 shrink' : 'size-5 shrink-0',
        showTextFallback && 'invisible',
      ]"
    >
      <span class="relative aspect-square h-full max-w-full">
        <Skeleton
          v-if="
            loadingSkeleton &&
            !animatedIndexes.has(index) &&
            staticImageStates.get(index) !== 'failed' &&
            staticImageStates.get(index) !== 'loaded'
          "
          class="image-skeleton !absolute inset-0"
          width="100%"
          height="100%"
          border-radius="50%"
        />
        <img
          ref="staticImages"
          :src="cardRarityStaticUrl"
          alt=""
          aria-hidden="true"
          class="absolute object-fill"
          :class="animatedIndexes.has(index) && 'invisible'"
          :style="{
            left: '0.5%',
            top: '2.5%',
            width: '99%',
            height: '94.5%',
          }"
          draggable="false"
          @load="onStaticImageLoad(index, $event)"
          @error="onStaticImageError(index, $event)"
        />
        <canvas
          ref="canvasElements"
          width="56"
          height="56"
          aria-hidden="true"
          class="invisible absolute inset-0 size-full"
          :class="animatedIndexes.has(index) && 'visible'"
        />
      </span>
    </span>
    <span v-if="showLabel && !showTextFallback" class="text-xs leading-tight">
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
