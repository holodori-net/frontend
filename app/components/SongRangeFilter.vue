<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type DifficultyOption = { value: number | null; label: string }

const props = withDefaults(
  defineProps<{
    inputId: string
    label: string
    modelValue: [number, number]
    min: number
    max: number
    difficulty?: number | null
    difficultyOptions?: DifficultyOption[]
    duration?: boolean
  }>(),
  { difficulty: null, difficultyOptions: () => [], duration: false },
)
const emit = defineEmits<{
  'update:modelValue': [value: [number, number]]
  'update:difficulty': [value: number | null]
}>()
const { t } = useI18n()

const minimumDraft = ref<number | null>(props.modelValue[0])
const maximumDraft = ref<number | null>(props.modelValue[1])
const minimumDurationDraft = ref(formatValue(props.modelValue[0]))
const maximumDurationDraft = ref(formatValue(props.modelValue[1]))
watch(
  () => props.modelValue,
  ([minimum, maximum]) => {
    minimumDraft.value = minimum
    maximumDraft.value = maximum
    minimumDurationDraft.value = formatValue(minimum)
    maximumDurationDraft.value = formatValue(maximum)
  },
  { deep: true },
)

const currentDifficulty = computed({
  get: () => props.difficulty ?? null,
  set: (value: number | null) => emit('update:difficulty', value),
})
const range = computed({
  get: () => props.modelValue,
  set: (value: number[]) => {
    const low = clamp(value[0] ?? props.min)
    const high = clamp(value[1] ?? props.max)
    emit('update:modelValue', [Math.min(low, high), Math.max(low, high)])
  },
})
function clamp(value: number) {
  return Math.min(props.max, Math.max(props.min, Math.trunc(value)))
}

function formatValue(value: number) {
  if (!props.duration) return String(value)
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`
}

function parseDurationValue(value: string) {
  const match = /^(\d+):([0-5]?\d)$/.exec(value.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function commitMinimum(value: number | null) {
  const minimum = clamp(value ?? props.min)
  const maximum = clamp(maximumDraft.value ?? props.max)
  const orderedMinimum = Math.min(minimum, maximum)
  minimumDraft.value = orderedMinimum
  maximumDraft.value = maximum
  if (
    orderedMinimum === props.modelValue[0] &&
    maximum === props.modelValue[1]
  ) {
    return
  }
  emit('update:modelValue', [orderedMinimum, maximum])
}

function commitMaximum(value: number | null) {
  const minimum = clamp(minimumDraft.value ?? props.min)
  const maximum = clamp(value ?? props.max)
  const orderedMaximum = Math.max(maximum, minimum)
  minimumDraft.value = minimum
  maximumDraft.value = orderedMaximum
  if (
    minimum === props.modelValue[0] &&
    orderedMaximum === props.modelValue[1]
  ) {
    return
  }
  emit('update:modelValue', [minimum, orderedMaximum])
}

function commitMinimumDuration() {
  const draft = minimumDurationDraft.value.trim()
  if (!draft) {
    commitMinimum(props.min)
    minimumDurationDraft.value = formatValue(minimumDraft.value ?? props.min)
    return
  }
  const value = parseDurationValue(draft)
  if (value === null) {
    minimumDurationDraft.value = formatValue(props.modelValue[0])
    return
  }
  commitMinimum(value)
  minimumDurationDraft.value = formatValue(minimumDraft.value ?? props.min)
}

function commitMaximumDuration() {
  const draft = maximumDurationDraft.value.trim()
  if (!draft) {
    commitMaximum(props.max)
    maximumDurationDraft.value = formatValue(maximumDraft.value ?? props.max)
    return
  }
  const value = parseDurationValue(draft)
  if (value === null) {
    maximumDurationDraft.value = formatValue(props.modelValue[1])
    return
  }
  commitMaximum(value)
  maximumDurationDraft.value = formatValue(maximumDraft.value ?? props.max)
}

const sliderPt = computed(() => ({
  startHandler: {
    'aria-label': t('songList.rangeMin', { label: props.label }),
    'aria-labelledby': undefined,
  },
  endHandler: {
    'aria-label': t('songList.rangeMax', { label: props.label }),
    'aria-labelledby': undefined,
  },
}))
</script>

<template>
  <fieldset class="min-w-0 w-full" :aria-labelledby="`${inputId}-label`">
    <div class="flex min-h-11 min-w-0 items-center">
      <span :id="`${inputId}-label`" class="min-w-0 text-sm font-medium">{{
        label
      }}</span>
    </div>
    <div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <Select
        v-if="difficultyOptions?.length"
        v-model="currentDifficulty"
        :input-id="`${inputId}-difficulty`"
        :aria-label="`${t('songList.difficultyLabel')} ${label}`"
        :placeholder="t('songList.allDifficulties')"
        :options="difficultyOptions"
        option-label="label"
        option-value="value"
        class="min-h-11 w-36 max-w-[9rem] shrink-0 self-start sm:self-auto"
      />
      <div class="flex min-h-11 min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <InputText
          v-if="duration"
          :id="`${inputId}-min`"
          v-model="minimumDurationDraft"
          :aria-label="t('songList.rangeMin', { label })"
          :title="t('songList.editRangeValue')"
          placeholder="m:ss"
          class="song-range-endpoint w-[5rem] min-h-11 min-w-0 shrink px-2 sm:w-28"
          @keydown.enter.prevent="commitMinimumDuration"
          @blur="commitMinimumDuration"
        />
        <InputNumber
          v-else
          :model-value="minimumDraft"
          :input-id="`${inputId}-min`"
          :aria-label="t('songList.rangeMin', { label })"
          :title="t('songList.editRangeValue')"
          :min="min"
          :max="modelValue[1]"
          :use-grouping="false"
          :min-fraction-digits="0"
          :max-fraction-digits="0"
          input-class="song-range-endpoint w-full min-h-11 min-w-0 px-2"
          class="w-[5rem] min-w-0 shrink sm:w-28"
          @input="
            minimumDraft =
              typeof $event.value === 'number' ? $event.value : null
          "
          @update:model-value="commitMinimum($event)"
        />
        <Slider
          v-model="range"
          range
          :min="min"
          :max="max"
          :step="1"
          :pt="sliderPt"
          class="mx-1 min-w-0 flex-1"
        />
        <InputText
          v-if="duration"
          :id="`${inputId}-max`"
          v-model="maximumDurationDraft"
          :aria-label="t('songList.rangeMax', { label })"
          :title="t('songList.editRangeValue')"
          placeholder="m:ss"
          class="song-range-endpoint w-[5rem] min-h-11 min-w-0 shrink px-2 sm:w-28"
          @keydown.enter.prevent="commitMaximumDuration"
          @blur="commitMaximumDuration"
        />
        <InputNumber
          v-else
          :model-value="maximumDraft"
          :input-id="`${inputId}-max`"
          :aria-label="t('songList.rangeMax', { label })"
          :title="t('songList.editRangeValue')"
          :min="modelValue[0]"
          :max="max"
          :use-grouping="false"
          :min-fraction-digits="0"
          :max-fraction-digits="0"
          input-class="song-range-endpoint w-full min-h-11 min-w-0 px-2"
          class="w-[5rem] min-w-0 shrink sm:w-28"
          @input="
            maximumDraft =
              typeof $event.value === 'number' ? $event.value : null
          "
          @update:model-value="commitMaximum($event)"
        />
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
:deep(.song-range-endpoint) {
  cursor: text;
  text-align: center;
}

:deep(.song-range-endpoint:not(:focus)) {
  background-color: transparent;
  border-color: transparent;
  box-shadow: none;
}

:deep(.song-range-endpoint:not(:focus):hover) {
  text-decoration: underline dotted;
  text-underline-offset: 0.25rem;
}
</style>
