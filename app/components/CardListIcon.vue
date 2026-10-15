<script setup lang="ts">
const props = defineProps<{
  src: string | null
  label: string
  monochrome?: boolean
  size?: 'small' | 'medium' | 'large'
  loadingSkeleton?: boolean
}>()

const { status, imageElement, onLoad, onError } = useImageLoading(
  computed(() => props.src),
)
const hasImage = computed(() => Boolean(props.src) && status.value !== 'failed')
const imageSizeClass = computed(() => {
  switch (props.size) {
    case 'small':
      return 'size-4'
    case 'large':
      return 'size-8'
    default:
      return 'size-5'
  }
})
</script>

<template>
  <span
    class="relative inline-flex max-w-full select-none items-center justify-center"
    :class="[
      hasImage && 'shrink-0',
      !hasImage && !label && imageSizeClass,
      !hasImage &&
        label &&
        size === 'large' &&
        'rounded-lg bg-surface-0/90 px-2 py-1 text-color shadow-sm dark:bg-surface-900/90',
    ]"
    :title="label || undefined"
    :aria-hidden="label ? undefined : true"
  >
    <Skeleton
      v-if="loadingSkeleton && hasImage && status === 'loading'"
      class="image-skeleton !absolute inset-0"
      :class="imageSizeClass"
      width="100%"
      height="100%"
      border-radius="0.125rem"
    />
    <img
      v-if="hasImage"
      ref="imageElement"
      :key="src!"
      :src="src!"
      :alt="label"
      :class="[
        imageSizeClass,
        'relative',
        'object-contain',
        monochrome && 'brightness-0 dark:invert',
      ]"
      draggable="false"
      @load="onLoad"
      @error="onError"
    />
    <span
      v-else-if="label"
      class="max-w-full break-words text-xs leading-tight"
    >
      {{ label }}
    </span>
  </span>
</template>
