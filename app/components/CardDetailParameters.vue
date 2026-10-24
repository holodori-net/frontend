<script setup lang="ts">
import type { CardStatKey } from '#shared/game-data/card-list-data'
import { getCardStatIconUrl } from '#shared/game-data/card-icons'

defineProps<{
  stats: Record<CardStatKey, number>
  total: number
  specializations: readonly CardStatKey[]
  statKeys: readonly CardStatKey[]
}>()
const { t, locale } = useI18n()
const numberFormatter = computed(() => new Intl.NumberFormat(locale.value))
const shortLabels: Record<CardStatKey, string> = {
  performance: 'P',
  technique: 'T',
  sense: 'S',
}
</script>

<template>
  <dl
    class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-stretch gap-x-3 gap-y-2 sm:gap-x-4"
  >
    <div
      v-for="(stat, index) in statKeys"
      :key="stat"
      class="col-start-1 grid min-h-11 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 sm:gap-x-3"
      :style="{ gridRow: index + 1 }"
    >
      <dt
        class="flex min-w-0 items-center gap-1.5 text-base font-medium leading-snug sm:gap-2 sm:text-lg"
      >
        <CardListIcon
          :src="getCardStatIconUrl(stat)"
          :label="shortLabels[stat]"
          aria-hidden="true"
          monochrome
          size="medium"
        />
        <span class="min-w-0 wrap-anywhere">{{
          t(`cardList.stat.${stat}`)
        }}</span>
      </dt>
      <dd
        class="m-0 whitespace-nowrap text-right text-lg font-semibold tabular-nums sm:text-xl"
        :class="specializations.includes(stat) && 'text-primary'"
      >
        {{ numberFormatter.format(stats[stat]) }}
      </dd>
    </div>
    <div
      class="col-start-2 row-start-1 row-span-3 flex min-w-0 flex-col items-center justify-center gap-1 border-l border-surface-200 pl-3 text-center dark:border-surface-700 sm:pl-4"
    >
      <dt
        class="text-sm font-medium text-surface-600 dark:text-surface-300 sm:text-base"
      >
        {{ t('cardList.total') }}
      </dt>
      <dd
        class="m-0 whitespace-nowrap text-2xl font-bold tabular-nums sm:text-4xl"
      >
        {{ numberFormatter.format(total) }}
      </dd>
    </div>
  </dl>
</template>
