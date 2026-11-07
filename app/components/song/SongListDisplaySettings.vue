<script setup lang="ts">
import { RotateCcw } from '@lucide/vue'
import {
  SONG_LIST_FIELDS,
  type SongListField,
} from '#shared/game-data/songs/display'

defineProps<{ fields: readonly SongListField[] }>()
const emit = defineEmits<{
  reset: []
  toggleField: [field: SongListField, selected: boolean]
}>()
const { t } = useI18n()
</script>

<template>
  <AccordionPanel value="display">
    <div class="flex items-stretch">
      <AccordionHeader class="min-w-0 flex-1"
        ><span class="flex flex-wrap items-center gap-x-2"
          >{{ t('songList.displaySettings')
          }}<span class="text-sm font-normal text-muted-color">{{
            t('songList.fieldsCount', { count: fields.length })
          }}</span></span
        ></AccordionHeader
      ><Button
        type="button"
        severity="secondary"
        text
        class="!h-auto min-h-11 !w-14 shrink-0 rounded-none !p-0"
        :aria-label="t('songList.resetDisplay')"
        :title="t('songList.resetDisplay')"
        @click="emit('reset')"
        ><RotateCcw
          aria-hidden="true"
          :size="20"
          :stroke-width="2"
          color="currentColor"
      /></Button>
    </div>
    <AccordionContent>
      <div class="flex flex-wrap items-start gap-2">
        <Button
          v-for="field in SONG_LIST_FIELDS"
          :key="field"
          :aria-label="t(`songList.field.${field}`)"
          type="button"
          size="small"
          class="h-auto min-h-8 max-w-full whitespace-normal rounded px-2 py-1 text-sm"
          :severity="fields.includes(field) ? 'primary' : 'secondary'"
          :outlined="!fields.includes(field)"
          :aria-pressed="fields.includes(field)"
          @click="emit('toggleField', field, !fields.includes(field))"
          >{{ t(`songList.field.${field}`) }}</Button
        >
      </div>
    </AccordionContent>
  </AccordionPanel>
</template>
