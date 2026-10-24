<script setup lang="ts">
import { getCardDetailSwitchMotifUrl } from '#shared/game-data/card-icons'

const props = defineProps<{
  label: string
  characterId: string
  characterAssetId: string | null
}>()

const model = defineModel<boolean>({ required: true })
const inputId = useId()
const { themes } = useMemberTheme()
const color = computed(
  () => themes.value?.find(({ id }) => id === props.characterId)?.color4,
)
const motif = computed(() =>
  getCardDetailSwitchMotifUrl(props.characterAssetId),
)
</script>

<template>
  <label
    class="card-detail-media-switch flex min-h-[44px] w-fit max-w-full flex-none cursor-pointer items-center gap-3 text-sm text-color"
    :for="inputId"
    :style="{
      '--card-detail-switch-color': color ?? '#28c3ff',
      '--card-detail-switch-motif': motif ? `url('${motif}')` : 'none',
    }"
  >
    <span class="card-detail-media-switch__label">{{ label }}</span>
    <ToggleSwitch v-model="model" :input-id="inputId" :aria-label="label" />
  </label>
</template>

<style scoped>
.card-detail-media-switch :deep(.p-toggleswitch) {
  --p-toggleswitch-width: 60px;
  --p-toggleswitch-height: 32px;
  --p-toggleswitch-handle-size: 24px;
  --p-toggleswitch-gap: 4px;
  --p-toggleswitch-background: rgb(98 98 142 / 55%);
  --p-toggleswitch-hover-background: rgb(98 98 142 / 55%);
  --p-toggleswitch-checked-background: var(--card-detail-switch-color);
  --p-toggleswitch-checked-hover-background: var(--card-detail-switch-color);
  --p-toggleswitch-border-color: rgb(255 255 255 / 25%);
  --p-toggleswitch-hover-border-color: rgb(255 255 255 / 25%);
  --p-toggleswitch-checked-border-color: rgb(255 255 255 / 25%);
  --p-toggleswitch-checked-hover-border-color: rgb(255 255 255 / 25%);
  --p-toggleswitch-handle-background: #fff;
  --p-toggleswitch-handle-hover-background: #fff;
  --p-toggleswitch-handle-checked-background: #fff;
  --p-toggleswitch-handle-checked-hover-background: #fff;
  flex: none;
}

.card-detail-media-switch :deep(.p-toggleswitch-slider) {
  overflow: hidden;
}

.card-detail-media-switch :deep(.p-toggleswitch-slider)::before {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: auto;
  inset-inline-end: 9px;
  width: 14px;
  height: 14px;
  background-image: var(--card-detail-switch-motif);
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  content: '';
  transform: translateY(-50%);
}

.card-detail-media-switch
  :deep(.p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-slider)::before {
  inset-inline-start: 9px;
  inset-inline-end: auto;
}

.card-detail-media-switch :deep(.p-toggleswitch-handle) {
  border: 1px solid
    color-mix(in srgb, var(--card-detail-switch-color) 35%, transparent);
  background: #fff;
}

.card-detail-media-switch
  :deep(
    .p-toggleswitch:has(.p-toggleswitch-input:focus-visible)
      .p-toggleswitch-slider
  ) {
  outline: 2px solid currentColor;
  outline-offset: 3px;
  box-shadow: none;
}

.card-detail-media-switch__label {
  min-width: 0;
  max-width: calc(100% - 72px);
  overflow-wrap: anywhere;
}

@media (prefers-reduced-motion: reduce) {
  .card-detail-media-switch :deep(.p-toggleswitch-slider),
  .card-detail-media-switch :deep(.p-toggleswitch-handle) {
    transition: none;
  }
}
</style>
