<script setup lang="ts">
const props = defineProps<{
  src: string | null
}>()

const source = computed(() => props.src)
const { status, imageElement, onLoad, onError } = useImageLoading(source)
</script>

<template>
  <img
    v-if="source && status !== 'failed'"
    ref="imageElement"
    :src="source"
    alt=""
    class="pointer-events-none absolute max-w-none object-contain"
    draggable="false"
    loading="lazy"
    decoding="async"
    @load="onLoad"
    @error="onError"
  />
</template>
