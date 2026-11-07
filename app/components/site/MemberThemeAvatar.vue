<script setup lang="ts">
const props = defineProps<{
  src: string | null
  color: string
}>()

const { status, imageElement, onLoad, onError } = useImageLoading(
  computed(() => props.src),
)
</script>

<template>
  <span
    class="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full"
    :style="{ backgroundColor: color }"
    aria-hidden="true"
  >
    <Skeleton
      v-if="src && status === 'loading'"
      class="image-skeleton !absolute inset-0 rounded-full"
      width="100%"
      height="100%"
    />
    <img
      v-if="src && status !== 'failed'"
      ref="imageElement"
      :key="src"
      :src="src"
      alt=""
      class="relative size-full rounded-full object-cover"
      @load="onLoad"
      @error="onError"
    />
  </span>
</template>
