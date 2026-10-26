<script setup lang="ts">
import { ArrowDownWideNarrow, ArrowUpNarrowWide, RotateCcw } from '@lucide/vue'
import { resolveLocalizedName, type GameLocale } from '#shared/language'
import { getCharacterIconUrl } from '#shared/game-data/character-list'
import type { SongListPayload } from '#shared/game-data/songs'
import {
  filterAndSortSongs,
  getAvailableSongs,
  getSongFilterOptions,
  SONG_LIST_FIELDS,
  type SongListSort,
} from '#shared/game-data/song-list'
import { useSongListConditions } from '~/composables/useSongListConditions'
import { useSongFields } from '~/composables/useSongFields'

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
const openPanels = ref<string[]>([])
const readyForDisplay = computed(() => ready.value && initialized.value)
const filterTotal = computed(() => availableSongs.value.length)
const sortOptions = computed(() =>
  (
    [
      'order',
      'title',
      'startTime',
      'playingSeconds',
      'levelEasy',
      'levelNormal',
      'levelHard',
      'levelExpert',
      'notes',
    ] as SongListSort[]
  ).map((value) => ({ value, label: t(`songList.sort.${value}`) })),
)
const categoryOptions = computed(() =>
  options.value.category.map((value) => ({
    value,
    label: t(`songList.category.${value}`, String(value)),
  })),
)
const singerOptions = computed(() =>
  options.value.singerType.map((value) => ({
    value,
    label: t(`songList.singerType.${value}`, String(value)),
  })),
)
const difficultyOptions = computed(() =>
  options.value.difficulty.map((value) => ({
    value,
    label: t(`songList.difficulty.${value}`, String(value)),
  })),
)
const characterOptions = computed(() =>
  props.payload.characters
    .filter((character) => options.value.character.includes(character.id))
    .map((character) => {
      const name = resolveLocalizedName(character.name, props.gameLocale)
      return {
        value: character.id,
        icon: getCharacterIconUrl(character.assetId),
        text: name.text,
        lang: name.lang,
        searchNames: Object.values(character.name).join(' '),
      }
    }),
)
type RangeValue = [number, number]
const levelBounds = computed(() => {
  const levels = availableSongs.value.flatMap((song) =>
    song.difficulties.map((chart) => chart.level),
  )
  return [
    levels.length ? Math.min(...levels) : 0,
    levels.length ? Math.max(...levels) : 99,
  ] as [number, number]
})
const noteBounds = computed(() => {
  const counts = availableSongs.value.flatMap((song) =>
    song.difficulties.map((chart) => chart.fullComboNoteCount),
  )
  return [
    counts.length ? Math.min(...counts) : 0,
    counts.length ? Math.max(...counts) : 9999,
  ] as [number, number]
})
const durationBounds = computed(() => {
  const durations = availableSongs.value.map((song) => song.playingSeconds)
  return [
    durations.length ? Math.min(...durations) : 0,
    durations.length ? Math.max(...durations) : 9999,
  ] as [number, number]
})
function rangeValue(
  min: number | null,
  max: number | null,
  bounds: RangeValue,
): RangeValue {
  const clamp = (value: number) =>
    Math.min(bounds[1], Math.max(bounds[0], value))
  return [clamp(min ?? bounds[0]), clamp(max ?? bounds[1])]
}
function updateRange(kind: 'level' | 'notes' | 'duration', value: number[]) {
  const bounds =
    kind === 'level'
      ? levelBounds.value
      : kind === 'notes'
        ? noteBounds.value
        : durationBounds.value
  const [minKey, maxKey] =
    kind === 'level'
      ? (['levelMin', 'levelMax'] as const)
      : kind === 'notes'
        ? (['notesMin', 'notesMax'] as const)
        : (['durationMin', 'durationMax'] as const)
  const [min = bounds[0], max = bounds[1]] = value
  conditions.value[minKey] = min <= bounds[0] ? null : min
  conditions.value[maxKey] = max >= bounds[1] ? null : max
}
const levelRange = computed({
  get: () =>
    rangeValue(
      conditions.value.levelMin,
      conditions.value.levelMax,
      levelBounds.value,
    ),
  set: (value: RangeValue) => updateRange('level', value),
})
const notesRange = computed({
  get: () =>
    rangeValue(
      conditions.value.notesMin,
      conditions.value.notesMax,
      noteBounds.value,
    ),
  set: (value: RangeValue) => updateRange('notes', value),
})
const durationRange = computed({
  get: () =>
    rangeValue(
      conditions.value.durationMin,
      conditions.value.durationMax,
      durationBounds.value,
    ),
  set: (value: RangeValue) => updateRange('duration', value),
})
const selectedLevelDifficulty = computed({
  get: () =>
    options.value.difficulty.every((value) =>
      conditions.value.difficulty.includes(value),
    )
      ? null
      : conditions.value.difficulty.length === 1
        ? conditions.value.difficulty[0]
        : null,
  set: (value: number | null) => {
    conditions.value.difficulty =
      value === null ? [...options.value.difficulty] : [value]
  },
})
const selectedNotesDifficulty = computed({
  get: () =>
    options.value.difficulty.every((value) =>
      conditions.value.notesDifficulty.includes(value),
    )
      ? null
      : conditions.value.notesDifficulty.length === 1
        ? conditions.value.notesDifficulty[0]
        : null,
  set: (value: number | null) => {
    conditions.value.notesDifficulty =
      value === null ? [...options.value.difficulty] : [value]
  },
})
const difficultyChoices = computed(() => [
  { value: null, label: t('songList.allDifficulties') },
  ...difficultyOptions.value,
])
const unlockOptions = computed(() =>
  [...options.value.unlock]
    .sort((a, b) => (a === 'none' ? -1 : b === 'none' ? 1 : 0))
    .map((value) => ({
      value,
      label: t(`songList.unlockType.${value}`),
    })),
)
const videoOptions = computed(() =>
  options.value.video.map((value) => ({
    value,
    label: t(`songList.video.${value}`),
  })),
)
function resetDisplay() {
  resetFields()
}
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
        <AccordionPanel value="filters">
          <div class="flex items-stretch">
            <AccordionHeader class="min-w-0 flex-1">{{
              t('cardList.filtersAndSort')
            }}</AccordionHeader
            ><Button
              type="button"
              severity="secondary"
              text
              class="!h-auto min-h-11 !w-14 shrink-0 rounded-none !p-0"
              :aria-label="t('songList.reset')"
              :title="t('songList.reset')"
              @click="resetConditions"
              ><RotateCcw
                aria-hidden="true"
                :size="20"
                :stroke-width="2"
                color="currentColor"
            /></Button>
          </div>
          <AccordionContent>
            <div class="space-y-4">
              <div
                class="grid grid-cols-1 items-start gap-4 min-[375px]:grid-cols-2 lg:grid-cols-3"
              >
                <label class="col-span-full block min-w-0">
                  <span class="mb-1.5 block text-sm font-medium">{{
                    t('songList.search')
                  }}</span>
                  <InputText
                    v-model="conditions.q"
                    class="w-full"
                    :placeholder="t('songList.searchPlaceholder')"
                    :aria-label="t('songList.search')"
                  />
                </label>
                <label class="block min-w-0">
                  <span class="mb-1.5 block text-sm font-medium">{{
                    t('songList.character')
                  }}</span>
                  <MultiSelect
                    v-model="conditions.character"
                    class="w-full"
                    :options="characterOptions"
                    option-label="text"
                    option-value="value"
                    :placeholder="t('songList.allCharacters')"
                    :aria-label="t('songList.character')"
                    filter
                    :filter-fields="['searchNames', 'value']"
                    display="chip"
                  >
                    <template #option="{ option }">
                      <div class="flex items-center gap-2">
                        <CardListIcon
                          :src="option.icon"
                          label=""
                          size="large"
                          loading-skeleton
                        />
                        <span :lang="option.lang">{{ option.text }}</span>
                      </div>
                    </template>
                    <template #chip="{ value, removeCallback }">
                      <Chip
                        class="p-multiselect-chip"
                        :label="
                          characterOptions.find(
                            (option) => option.value === value,
                          )?.text ?? value
                        "
                        :lang="
                          characterOptions.find(
                            (option) => option.value === value,
                          )?.lang
                        "
                        removable
                        @remove="removeCallback($event, value)"
                      />
                    </template>
                  </MultiSelect>
                </label>
                <fieldset class="min-w-0">
                  <legend class="mb-1.5 text-sm font-medium">
                    {{ t('songList.categoryLabel') }}
                  </legend>
                  <div class="flex flex-wrap gap-1">
                    <label
                      v-for="option in categoryOptions"
                      :key="option.value"
                      :for="`song-category-${option.value}`"
                      class="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-surface-100 dark:hover:bg-surface-800"
                    >
                      <Checkbox
                        v-model="conditions.category"
                        :input-id="`song-category-${option.value}`"
                        :value="option.value"
                      /><span>{{ option.label }}</span>
                    </label>
                  </div>
                </fieldset>
                <fieldset class="min-w-0">
                  <legend class="mb-1.5 text-sm font-medium">
                    {{ t('songList.singerTypeLabel') }}
                  </legend>
                  <div class="flex flex-wrap gap-1">
                    <label
                      v-for="option in singerOptions"
                      :key="option.value"
                      :for="`song-singer-type-${option.value}`"
                      class="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-surface-100 dark:hover:bg-surface-800"
                    >
                      <Checkbox
                        v-model="conditions.singerType"
                        :input-id="`song-singer-type-${option.value}`"
                        :value="option.value"
                      /><span>{{ option.label }}</span>
                    </label>
                  </div>
                </fieldset>
                <fieldset class="min-w-0">
                  <legend class="mb-1.5 text-sm font-medium">
                    {{ t('songList.streamingMuteLabel') }}
                  </legend>
                  <div class="flex flex-wrap gap-1">
                    <label
                      v-for="option in [
                        { value: true, label: t('songList.muted') },
                        { value: false, label: t('songList.notMuted') },
                      ]"
                      :key="String(option.value)"
                      :for="`song-streaming-mute-${String(option.value)}`"
                      class="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-surface-100 dark:hover:bg-surface-800"
                    >
                      <Checkbox
                        v-model="conditions.streamingMute"
                        :input-id="`song-streaming-mute-${String(option.value)}`"
                        :value="option.value"
                      /><span>{{ option.label }}</span>
                    </label>
                  </div>
                </fieldset>
                <fieldset class="min-w-0">
                  <legend class="mb-1.5 text-sm font-medium">
                    {{ t('songList.videoLabel') }}
                  </legend>
                  <div class="flex flex-wrap gap-1">
                    <label
                      v-for="option in videoOptions"
                      :key="option.value"
                      :for="`song-video-${option.value}`"
                      class="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-surface-100 dark:hover:bg-surface-800"
                    >
                      <Checkbox
                        v-model="conditions.video"
                        :input-id="`song-video-${option.value}`"
                        :value="option.value"
                      /><span>{{ option.label }}</span>
                    </label>
                  </div>
                </fieldset>
                <fieldset class="min-w-0">
                  <legend class="mb-1.5 text-sm font-medium">
                    {{ t('songList.unlockLabel') }}
                  </legend>
                  <div class="flex flex-wrap gap-1">
                    <label
                      v-for="option in unlockOptions"
                      :key="option.value"
                      :for="`song-unlock-${option.value}`"
                      class="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-surface-100 dark:hover:bg-surface-800"
                    >
                      <Checkbox
                        v-model="conditions.unlock"
                        :input-id="`song-unlock-${option.value}`"
                        :value="option.value"
                      /><span>{{ option.label }}</span>
                    </label>
                  </div>
                </fieldset>
                <SongRangeFilter
                  v-model="levelRange"
                  v-model:difficulty="selectedLevelDifficulty"
                  class="col-span-full"
                  input-id="song-level-range"
                  :label="t('songList.levelLabel')"
                  :min="levelBounds[0]"
                  :max="levelBounds[1]"
                  :difficulty-options="difficultyChoices"
                />
                <SongRangeFilter
                  v-model="notesRange"
                  v-model:difficulty="selectedNotesDifficulty"
                  class="col-span-full"
                  input-id="song-notes-range"
                  :label="t('songList.notesLabel')"
                  :min="noteBounds[0]"
                  :max="noteBounds[1]"
                  :difficulty-options="difficultyChoices"
                />
                <SongRangeFilter
                  v-model="durationRange"
                  class="col-span-full"
                  input-id="song-duration-range"
                  :label="t('songList.durationLabel')"
                  :min="durationBounds[0]"
                  :max="durationBounds[1]"
                  duration
                />
              </div>
              <Message v-if="queryError" severity="warn" :closable="false">{{
                t('songList.queryError')
              }}</Message>
              <div class="flex flex-wrap items-end gap-3">
                <label class="min-w-48 flex-1 sm:flex-none"
                  ><span class="mb-1.5 block text-sm font-medium">{{
                    t('songList.sortLabel')
                  }}</span
                  ><Select
                    v-model="conditions.sort"
                    :aria-label="t('songList.sortLabel')"
                    class="w-full sm:min-w-52"
                    :options="sortOptions"
                    option-label="label"
                    option-value="value" /></label
                ><Button
                  type="button"
                  class="!size-11 !p-0"
                  severity="secondary"
                  outlined
                  :aria-label="
                    t(
                      `songList.${conditions.direction === 'desc' ? 'descending' : 'ascending'}`,
                    )
                  "
                  :title="
                    t(
                      `songList.${conditions.direction === 'desc' ? 'descending' : 'ascending'}`,
                    )
                  "
                  @click="
                    conditions.direction =
                      conditions.direction === 'desc' ? 'asc' : 'desc'
                  "
                  ><ArrowDownWideNarrow
                    v-if="conditions.direction === 'desc'"
                    aria-hidden="true"
                    :size="20"
                    :stroke-width="2"
                    color="currentColor" /><ArrowUpNarrowWide
                    v-else
                    aria-hidden="true"
                    :size="20"
                    :stroke-width="2"
                    color="currentColor"
                /></Button>
              </div></div
          ></AccordionContent>
        </AccordionPanel>
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
              @click="resetDisplay"
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
                @click="toggleField(field, !fields.includes(field))"
                >{{ t(`songList.field.${field}`) }}</Button
              >
            </div>
          </AccordionContent>
        </AccordionPanel>
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
