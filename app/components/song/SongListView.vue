<script setup lang="ts">
import type { GameLocale } from '#shared/language'
import type { SongListPayload } from '#shared/game-data/songs'
import {
  filterAndSortSongs,
  getAvailableSongs,
  getSongFilterOptions,
} from '#shared/game-data/songs/list'
import { useSongListConditions } from '~/composables/song/useSongListConditions'
import { useSongFields } from '~/composables/song/useSongFields'
import { useListPanels } from '~/composables/useListPanels'

const props = defineProps<{
  payload: SongListPayload
  gameLocale: GameLocale
  availableAt: number
}>()
const { t } = useI18n()
const availableSongs = computed(() =>
  getAvailableSongs(props.payload.songs, props.availableAt),
)
const options = computed(() => getSongFilterOptions(availableSongs.value))
const {
  conditions,
  ready,
  reset: resetConditions,
  queryError,
} = useSongListConditions(options)
const { fields, toggleField, reset: resetFields, initialized } = useSongFields()
const visibleSongs = computed(() =>
  filterAndSortSongs(
    availableSongs.value,
    conditions.value,
    props.gameLocale,
    props.payload.searchTextBySongId,
  ),
)
const { panels: openPanels, initialized: panelsInitialized } =
  useListPanels('songs')
const readyForDisplay = computed(
  () => ready.value && initialized.value && panelsInitialized.value,
)
const filterTotal = computed(() => availableSongs.value.length)
</script>

<template>
  <p
    v-if="!readyForDisplay"
    class="py-16 text-center text-sm text-muted-color"
    role="status"
  >
    {{ t('songList.loading') }}
  </p>
  <template v-else>
    <section
      class="mx-auto mb-4 w-full max-w-[100rem] overflow-hidden rounded-xl border border-surface-200 bg-surface-0 dark:border-surface-700 dark:bg-surface-900"
      :aria-label="t('songList.controls')"
    >
      <Accordion v-model:value="openPanels" multiple>
        <SongListFilters
          v-model="conditions"
          :songs="availableSongs"
          :characters="payload.characters"
          :options="options"
          :game-locale="gameLocale"
          :query-error="queryError"
          @reset="resetConditions"
        />
        <SongListDisplaySettings
          :fields="fields"
          @reset="resetFields"
          @toggle-field="toggleField"
        />
      </Accordion>
    </section>
    <p
      class="mx-auto mb-4 w-full max-w-[100rem] text-sm text-muted-color"
      role="status"
      aria-live="polite"
    >
      {{
        t('songList.resultCount', {
          visible: visibleSongs.length,
          total: filterTotal,
        })
      }}
    </p>
    <p
      v-if="!visibleSongs.length"
      class="py-16 text-center text-sm text-muted-color"
    >
      {{ t('songList.noResults') }}
    </p>
    <ul
      v-else
      class="mx-auto grid w-full list-none grid-cols-[repeat(auto-fill,minmax(min(100%,16.875rem),1fr))] gap-x-5 gap-y-0 p-0"
      :aria-label="t('songs')"
    >
      <SongListItem
        v-for="song in visibleSongs"
        :key="song.id"
        :song="song"
        :payload="payload"
        :fields="fields"
        :game-locale="gameLocale"
      />
    </ul>
  </template>
</template>
