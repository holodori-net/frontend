<script setup lang="ts">
import type {
  CardConnectFilterCatalog,
  CardConnectFilterOption,
} from '#shared/game-data/card-connect-filter'
import { useId } from 'vue'

const props = defineProps<{
  catalog: CardConnectFilterCatalog
  counts: Readonly<Record<string, number>>
  modelValue: string[]
  visibleCardCount: number
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
const { t } = useI18n()
const id = useId()
const dialogVisible = ref(false)
const selected = computed(() => new Set(props.modelValue))
function optionLabel(option: CardConnectFilterOption, index: number) {
  if (option.shape && option.direction) {
    return `${t(`cardList.connectFilter.shape.${option.shape}`)} · ${t(`cardList.connectFilter.direction.${option.direction}`)}`
  }
  return t('cardList.connectFilter.unknownPattern', {
    number: index + 1,
    count: option.positions.length,
  })
}
function toggle(key: string) {
  const next = new Set(selected.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  emit('update:modelValue', [...next])
}
function selectAll() {
  emit(
    'update:modelValue',
    props.catalog.options.map(({ key }) => key),
  )
}
function clearSelection() {
  emit('update:modelValue', [])
}
const dialogId = `${id}-dialog`
const dialogPt = {
  root: { id: dialogId },
  header: { class: '!px-4 !py-2' },
  content: {
    class: 'flex min-h-0 flex-1 flex-col overflow-hidden !px-3 !pb-2 sm:!px-4',
  },
  footer: { class: '!px-4 !pb-3' },
}
</script>

<template>
  <div class="min-w-0">
    <Button
      type="button"
      severity="secondary"
      outlined
      class="w-full justify-between"
      :aria-controls="dialogId"
      :aria-expanded="dialogVisible"
      aria-haspopup="dialog"
      @click="dialogVisible = true"
    >
      <span class="truncate">
        {{
          selected.size
            ? t('cardList.connectFilter.selectedCount', {
                count: selected.size,
              })
            : t('cardList.connectFilter.unlimited')
        }}
      </span>
    </Button>
    <Dialog
      v-model:visible="dialogVisible"
      :header="t('cardList.connectFilter.title')"
      modal
      dismissable-mask
      :close-button-props="{
        'aria-label': t('cardList.connectFilter.close'),
        severity: 'secondary',
        text: true,
        rounded: true,
      }"
      :style="{
        width: 'min(64rem, calc(100vw - 1rem))',
        height: '56rem',
        maxHeight: 'calc(100dvh - 2rem)',
      }"
      :pt="dialogPt"
    >
      <div
        class="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5"
      >
        <label
          v-for="(option, index) in catalog.options"
          :key="option.key"
          :for="`${id}-option-${index}`"
          :class="selected.has(option.key) ? '!border-primary' : ''"
          class="flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-lg border border-surface-200 p-1.5 text-center hover:bg-surface-100 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary dark:border-surface-700 dark:hover:bg-surface-800 sm:p-2"
        >
          <div class="flex w-full items-center justify-between gap-1">
            <Checkbox
              :input-id="`${id}-option-${index}`"
              :model-value="selected.has(option.key)"
              binary
              :aria-label="`${optionLabel(option, index)} · ${t('cardList.connectFilter.optionCount', { count: counts[option.key] ?? 0 })}`"
              @update:model-value="toggle(option.key)"
            />
            <Badge
              :value="counts[option.key] ?? 0"
              severity="secondary"
              class="!min-w-8 shrink-0"
              aria-hidden="true"
            />
          </div>
          <CardListConnectGraph :positions="option.positions" />
          <span class="text-xs leading-4">{{
            optionLabel(option, index)
          }}</span>
        </label>
      </div>
      <template #footer>
        <div class="flex w-full flex-wrap items-center justify-between gap-3">
          <span class="text-xs text-muted-color">
            {{
              t('cardList.connectFilter.visibleCardCount', {
                count: visibleCardCount,
              })
            }}
          </span>
          <div class="flex flex-wrap justify-end gap-2">
            <Button type="button" severity="secondary" text @click="selectAll">
              {{ t('cardList.connectFilter.selectAll') }}
            </Button>
            <Button
              type="button"
              severity="secondary"
              text
              :disabled="!selected.size"
              @click="clearSelection"
            >
              {{ t('cardList.connectFilter.clear') }}
            </Button>
            <Button type="button" @click="dialogVisible = false">
              {{ t('cardList.connectFilter.done') }}
            </Button>
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>
