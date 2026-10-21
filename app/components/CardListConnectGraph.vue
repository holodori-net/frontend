<script setup lang="ts">
import { Star } from '@lucide/vue'
import type { ConnectPosition } from '#shared/game-data/skill-tree-connect-effects'
import { buildConnectGraphGrid } from '#shared/game-data/connect-graph'

const props = defineProps<{
  positions: readonly ConnectPosition[]
}>()

const { t } = useI18n()
const grid = computed(() => buildConnectGraphGrid(props.positions))
const cellSize = 18
const gap = 3
const step = cellSize + gap
const viewSize = computed(() => grid.value.size * step)
const origin = computed(() => {
  const cell = grid.value.cells.find(({ origin }) => origin)!
  return {
    left: `${((cell.column + 0.5) / grid.value.size) * 100}%`,
    top: `${((cell.row + 0.5) / grid.value.size) * 100}%`,
  }
})
const accessibleLabel = computed(() =>
  t('cardList.connectGraphDescription', { count: props.positions.length }),
)
</script>

<template>
  <div class="relative size-28 max-w-full shrink-0">
    <svg
      class="block size-full"
      :viewBox="`0 0 ${viewSize} ${viewSize}`"
      role="img"
      :aria-label="accessibleLabel"
      focusable="false"
    >
      <title>{{ accessibleLabel }}</title>
      <rect
        v-for="cell in grid.cells"
        :key="`${cell.x},${cell.y}`"
        :x="cell.column * step + gap / 2"
        :y="cell.row * step + gap / 2"
        :width="cellSize"
        :height="cellSize"
        rx="3"
        :class="
          cell.affected
            ? 'fill-primary stroke-primary-700 dark:stroke-primary-300'
            : 'fill-surface-200 stroke-surface-400 dark:fill-surface-700 dark:stroke-surface-500'
        "
        stroke-width="1.5"
      />
    </svg>
    <Star
      class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-color"
      :style="{ left: origin.left, top: origin.top }"
      :size="20"
      :stroke-width="2"
      aria-hidden="true"
    />
  </div>
</template>
