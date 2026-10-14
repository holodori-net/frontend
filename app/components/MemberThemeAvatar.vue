<script setup lang="ts">
const props = defineProps<{
  src: string | null
  color: string
}>()

const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <span
    class="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full"
    :style="{ backgroundColor: color }"
    aria-hidden="true"
  >
    <img
      v-if="src && !failed"
      :src="src"
      alt=""
      class="size-full rounded-full object-cover"
      @error="failed = true"
    />
  </span>
</template>
