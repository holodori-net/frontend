<script setup lang="ts">
import type { CharacterGroupData } from '#shared/game-data/character-groups'
import { getCardDetailGroupingArtworkUrl } from '#shared/game-data/card-icons'
import { resolveLocalizedName, type GameLocale } from '#shared/language'

const props = defineProps<{
  group: Pick<CharacterGroupData, 'id' | 'name' | 'color1' | 'color2'>
  gameLocale: GameLocale
}>()
const label = computed(() =>
  resolveLocalizedName(props.group.name, props.gameLocale),
)
const maskId = `card-detail-group-mask-${useId()}`
const color = (value: string) => (value.startsWith('#') ? value : `#${value}`)
</script>

<template>
  <span
    class="card-detail-grouping-label relative inline-flex max-w-full items-center justify-center font-extrabold leading-none text-white"
    :lang="label.lang"
  >
    <svg class="absolute size-0" aria-hidden="true" focusable="false">
      <defs>
        <mask
          :id="maskId"
          maskUnits="objectBoundingBox"
          maskContentUnits="objectBoundingBox"
          style="mask-type: alpha"
        >
          <g transform="scale(0.0104166666666667 0.0208333333333333)">
            <CardDetailSpriteMask
              :src="getCardDetailGroupingArtworkUrl('base')"
              :width="96"
              :height="48"
              :source-width="32.5"
              :source-height="48"
              :left="20"
              :right="12.5"
            />
          </g>
        </mask>
      </defs>
    </svg>
    <span
      class="absolute inset-0 overflow-hidden"
      :style="{
        backgroundImage: `linear-gradient(to right, ${color(group.color1)}, ${color(group.color2)})`,
        maskImage: `url(#${maskId})`,
      }"
      aria-hidden="true"
    />
    <span
      class="card-detail-grouping-label__outline absolute inset-0"
      :style="{
        borderImageSource: `url('${getCardDetailGroupingArtworkUrl('outline')}')`,
      }"
      aria-hidden="true"
    />
    <span class="relative whitespace-nowrap">{{ label.text }}</span>
  </span>
</template>

<style scoped>
.card-detail-grouping-label {
  --label-unit: max(0.5px, var(--artwork-unit));
  height: calc(48 * var(--label-unit));
  padding-left: calc(12 * var(--label-unit));
  padding-right: calc(16 * var(--label-unit));
  font-size: calc(28 * var(--label-unit));
  text-shadow:
    -1px 0 rgb(98 98 142 / 55%),
    1px 0 rgb(98 98 142 / 55%),
    0 -1px rgb(98 98 142 / 55%),
    0 1px rgb(98 98 142 / 55%);
}

.card-detail-grouping-label__outline {
  border: solid transparent;
  border-width: 0 calc(12.5 * var(--label-unit)) 0 calc(20 * var(--label-unit));
  border-image-slice: 0 12 0 19 fill;
  opacity: 0.65;
}
</style>
