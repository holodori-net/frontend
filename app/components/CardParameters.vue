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
</script>

<template>
  <dl
    class="card-list-parameters-row flex flex-wrap items-center justify-center gap-x-1 gap-y-1"
  >
    <div
      v-for="(stat, index) in statKeys"
      :key="stat"
      class="inline-flex min-w-0 max-w-full flex-[0_1_auto] items-center gap-1 py-1"
    >
      <span v-if="index > 0" aria-hidden="true" class="mx-1 shrink-0">+</span>
      <dt class="sr-only">{{ t(`cardList.stat.${stat}`) }}</dt>
      <dd
        class="m-0 inline-flex min-w-0 items-center gap-1 font-medium tabular-nums"
      >
        <CardListIcon
          :src="getCardStatIconUrl(stat)"
          :label="t(`cardList.stat.${stat}`)"
          aria-hidden="true"
          monochrome
          size="small"
        />
        <span
          class="ml-px text-sm"
          :class="specializations.includes(stat) && 'text-primary'"
        >
          {{ numberFormatter.format(stats[stat]) }}
        </span>
      </dd>
    </div>
    <div
      class="inline-flex min-w-0 max-w-full flex-[0_1_auto] items-center gap-1 py-1"
    >
      <span aria-hidden="true" class="mx-1 shrink-0">=</span>
      <dt class="sr-only">{{ t('cardList.total') }}</dt>
      <dd
        class="m-0 inline-flex min-w-0 items-center gap-1 font-bold tabular-nums"
      >
        <span>{{ numberFormatter.format(total) }}</span>
      </dd>
    </div>
  </dl>
</template>

<style scoped>
.card-list-parameters-row {
  margin-top: 0;
}
</style>
