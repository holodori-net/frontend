<script setup lang="ts">
import { getCardAttributeIconUrl } from '#shared/game-data/card-icons'

const props = defineProps<{
  attribute: 'cute' | 'pure' | 'happy'
  text: string
}>()

const attributeNumber = computed(() =>
  props.attribute === 'cute' ? 1 : props.attribute === 'pure' ? 2 : 3,
)
const iconUrl = computed(() => getCardAttributeIconUrl(attributeNumber.value))
const { status, imageElement, onLoad, onError } = useImageLoading(iconUrl)
const iconStyle = computed(() => ({
  '--skill-attribute-icon': iconUrl.value ? `url("${iconUrl.value}")` : 'none',
}))
</script>

<template>
  <span
    class="skill-attribute"
    :class="status === 'failed' && 'skill-attribute--failed'"
    :style="iconStyle"
  >
    <img
      v-if="iconUrl"
      ref="imageElement"
      :key="iconUrl"
      :src="iconUrl"
      alt=""
      hidden
      draggable="false"
      aria-hidden="true"
      @load="onLoad"
      @error="onError"
    />{{ text }}
  </span>
</template>

<style scoped>
.skill-attribute::before {
  display: inline-block;
  width: 1em;
  height: 1em;
  margin-inline: 0.25em;
  background-image: var(--skill-attribute-icon);
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  content: '';
  vertical-align: -0.15em;
}

.skill-attribute--failed::before {
  display: none;
  margin-inline: 0;
}
</style>
