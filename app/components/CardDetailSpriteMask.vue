<script setup lang="ts">
defineProps<{
  src: string
  width: number
  height: number
  sourceWidth: number
  sourceHeight: number
  left: number
  right: number
}>()

// Keep opaque joins covered when the artwork scales down.
const overlap = 4
</script>

<template>
  <g>
    <svg
      :width="left"
      :height="height"
      :viewBox="`0 0 ${left} ${sourceHeight}`"
      preserveAspectRatio="none"
      overflow="hidden"
    >
      <image :href="src" :width="sourceWidth" :height="sourceHeight" />
    </svg>
    <rect
      :x="left - overlap"
      :width="width - left - right + overlap * 2"
      :height="height"
      fill="white"
    />
    <svg
      :x="width - right"
      :width="right"
      :height="height"
      :viewBox="`${sourceWidth - right} 0 ${right} ${sourceHeight}`"
      preserveAspectRatio="none"
      overflow="hidden"
    >
      <image :href="src" :width="sourceWidth" :height="sourceHeight" />
    </svg>
  </g>
</template>
