<script setup lang="ts">
const props = defineProps<{
  src: string | null
  label: string
  monochrome?: boolean
  size?: 'small' | 'medium' | 'large'
}>()

const imageFailed = ref(false)
const imageElement = ref<HTMLImageElement | null>(null)
const hasImage = computed(() => Boolean(props.src) && !imageFailed.value)
const imageSizeClass = computed(() => {
  switch (props.size) {
    case 'small':
      return 'size-3.5'
    case 'large':
      return 'size-8'
    default:
      return 'size-5'
  }
})

watch(
  () => props.src,
  () => {
    imageFailed.value = false
  },
)

onMounted(() => {
  if (imageElement.value?.complete && imageElement.value.naturalWidth === 0) {
    imageFailed.value = true
  }
})
</script>

<template>
  <span
    class="inline-flex max-w-full items-center justify-center"
    :class="[
      hasImage && 'shrink-0',
      !hasImage && !label && imageSizeClass,
      monochrome && hasImage && 'rounded bg-surface-700 p-1',
      !hasImage &&
        label &&
        size === 'large' &&
        'rounded-lg bg-surface-0/90 px-2 py-1 text-color shadow-sm dark:bg-surface-900/90',
    ]"
    :title="label || undefined"
    :aria-hidden="label ? undefined : true"
  >
    <img
      v-if="hasImage"
      ref="imageElement"
      :src="src!"
      :alt="label"
      :class="[imageSizeClass, 'object-contain']"
      draggable="false"
      @error="imageFailed = true"
    />
    <span
      v-else-if="label"
      class="max-w-full break-words text-xs leading-tight"
    >
      {{ label }}
    </span>
  </span>
</template>
