<script setup lang="ts">
import { tokenizeSkillText } from '#shared/game-data/skill-text'

const props = defineProps<{ text: string; lang: string }>()
const parts = computed(() => tokenizeSkillText(props.text))
</script>

<template>
  <span class="whitespace-pre-line wrap-anywhere" :lang="lang">
    <template v-for="(part, index) in parts" :key="index">
      <span v-if="part.type === 'text'">{{ part.value }}</span>
      <CardListSkillAttribute
        v-else
        :attribute="part.attribute"
        :text="part.value"
      />
    </template>
  </span>
</template>
