<script setup lang="ts">
defineProps<{
  icon: string | null
  text: string
  lang: string
}>()
</script>

<template>
  <div class="flex min-w-0 items-center gap-2 text-base font-normal">
    <CardListIcon :src="icon" label="" size="large" loading-skeleton />
    <span :lang="lang" class="min-w-0 whitespace-normal">{{ text }}</span>
  </div>
</template>
