<script setup lang="ts">
import { ArrowDownWideNarrow, ArrowUpNarrowWide, RotateCcw } from '@lucide/vue'
import { resolveLocalizedName, type GameLocale } from '#shared/language'
import type { SongListPayload } from '#shared/game-data/songs'
import {
  filterAndSortSongs,
  getAvailableSongs,
  getSongFilterOptions,
  getSongListFieldGroups,
  SONG_BASIC_FIELDS,
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
const {
  fields,
  chartDifficulties,
  toggleField,
  toggleDifficulty,
  reset: resetFields,
  initialized,
} = useSongFields()
const visibleSongs = computed(() =>
  filterAndSortSongs(
    availableSongs.value,
    conditions.value,
    props.gameLocale,
    props.payload.searchTextBySongId,
  ),
)
const groups = computed(() => getSongListFieldGroups(fields.value))
const openPanels = ref(['filters', 'display'])
const sortOptions = computed(() =>
  (
    [
      'order',
      'title',
      'startTime',
      'playingSeconds',
      'level',
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
    label: t(`songList.difficulty.${value}`, value.toString()),
  })),
)
const characterOptions = computed(() =>
  props.payload.characters
    .filter((character) => options.value.character.includes(character.id))
    .map((character) => {
      const name = resolveLocalizedName(character.name, props.gameLocale)
      return {
        value: character.id,
        label: name.text,
        lang: name.lang,
        search: Object.values(character.name).join(' '),
      }
    }),
)
const additionalFields = SONG_LIST_FIELDS.filter(
  (field) =>
    !([...SONG_BASIC_FIELDS, 'charts'] as readonly string[]).includes(field),
)
const selectedGroups = computed(() => groups.value.length)
const readyForDisplay = computed(() => ready.value && initialized.value)
const filterTotal = computed(() => availableSongs.value.length)
function setLevel(key: 'levelMin' | 'levelMax', event: Event) {
  const value = (event.target as HTMLInputElement).value
  const level = Number(value)
  conditions.value[key] =
    value !== '' && Number.isSafeInteger(level) ? level : null
}
function resetDisplay() {
  resetFields()
}
function getOptionLabel(
  value: number,
  type: 'category' | 'singerType' | 'difficulty',
) {
  return t(`songList.${type}.${value}`, String(value))
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
              t('songList.filters')
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
          <AccordionContent
            ><div class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label class="col-span-full block min-w-0"
                  ><span class="mb-1.5 block text-sm font-medium">{{
                    t('songList.search')
                  }}</span
                  ><InputText
                    id="song-search"
                    v-model="conditions.q"
                    :aria-label="t('songList.search')"
                    class="w-full"
                    :placeholder="t('songList.searchPlaceholder')"
                /></label>
                <label class="block min-w-0"
                  ><span class="mb-1.5 block text-sm font-medium">{{
                    t('songList.character')
                  }}</span
                  ><MultiSelect
                    v-model="conditions.character"
                    :aria-label="t('songList.character')"
                    class="w-full"
                    :options="characterOptions"
                    option-label="label"
                    option-value="value"
                    :placeholder="t('songList.allCharacters')"
                    filter
                    :filter-fields="['search', 'value']"
                    display="chip"
                    ><template #option="{ option }"
                      ><span :lang="option.lang">{{
                        option.label
                      }}</span></template
                    ></MultiSelect
                  ></label
                >
                <label class="block min-w-0"
                  ><span class="mb-1.5 block text-sm font-medium">{{
                    t('songList.categoryLabel')
                  }}</span
                  ><MultiSelect
                    v-model="conditions.category"
                    :aria-label="t('songList.categoryLabel')"
                    class="w-full"
                    :options="categoryOptions"
                    option-label="label"
                    option-value="value"
                    :placeholder="t('songList.allCategories')"
                    display="chip"
                /></label>
                <label class="block min-w-0"
                  ><span class="mb-1.5 block text-sm font-medium">{{
                    t('songList.singerTypeLabel')
                  }}</span
                  ><MultiSelect
                    v-model="conditions.singerType"
                    :aria-label="t('songList.singerTypeLabel')"
                    class="w-full"
                    :options="singerOptions"
                    option-label="label"
                    option-value="value"
                    :placeholder="t('songList.allSingerTypes')"
                    display="chip"
                /></label>
                <label class="block min-w-0"
                  ><span class="mb-1.5 block text-sm font-medium">{{
                    t('songList.difficultyLabel')
                  }}</span
                  ><MultiSelect
                    v-model="conditions.difficulty"
                    :aria-label="t('songList.difficultyLabel')"
                    class="w-full"
                    :options="difficultyOptions"
                    option-label="label"
                    option-value="value"
                    :placeholder="t('songList.allDifficulties')"
                    display="chip"
                /></label>
                <label class="block min-w-0"
                  ><span class="mb-1.5 block text-sm font-medium">{{
                    t('songList.levelMin')
                  }}</span
                  ><input
                    :value="conditions.levelMin"
                    :aria-label="t('songList.levelMin')"
                    type="number"
                    min="0"
                    max="99"
                    class="p-inputtext w-full"
                    @input="setLevel('levelMin', $event)"
                /></label>
                <label class="block min-w-0"
                  ><span class="mb-1.5 block text-sm font-medium">{{
                    t('songList.levelMax')
                  }}</span
                  ><input
                    :value="conditions.levelMax"
                    :aria-label="t('songList.levelMax')"
                    type="number"
                    min="0"
                    max="99"
                    class="p-inputtext w-full"
                    @input="setLevel('levelMax', $event)"
                /></label>
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
                  t('songList.fieldsCount', { count: selectedGroups })
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
          <AccordionContent
            ><div class="flex flex-wrap items-start gap-2">
              <InputGroup
                role="group"
                :aria-label="t('songList.basicInformation')"
                class="w-auto min-w-0 max-w-full flex-wrap items-stretch"
                style="--p-inputgroup-addon-border-radius: 0.25rem"
                ><InputGroupAddon
                  class="h-auto min-h-8 gap-1.5 px-2 py-1 text-sm font-medium"
                  ><Badge
                    aria-hidden="true"
                    :value="
                      groups.findIndex((group) => group.key === 'basic') + 1 ||
                      '−'
                    "
                    severity="contrast"
                    class="size-5 min-w-5 rounded-full p-0 leading-5"
                  /><span>{{
                    t('songList.basicInformation')
                  }}</span></InputGroupAddon
                ><Button
                  v-for="field in SONG_BASIC_FIELDS"
                  :key="field"
                  :aria-label="t(`songList.field.${field}`)"
                  type="button"
                  size="small"
                  class="h-auto min-h-8 whitespace-normal px-2 py-1 text-sm"
                  :severity="fields.includes(field) ? 'primary' : 'secondary'"
                  :outlined="!fields.includes(field)"
                  :aria-pressed="fields.includes(field)"
                  @click="toggleField(field, !fields.includes(field))"
                  >{{ t(`songList.field.${field}`) }}</Button
                ></InputGroup
              >
              <InputGroup
                role="group"
                :aria-label="t('songList.charts')"
                class="w-auto min-w-0 max-w-full flex-wrap items-stretch"
                style="--p-inputgroup-addon-border-radius: 0.25rem"
                ><InputGroupAddon
                  class="h-auto min-h-8 gap-1.5 px-2 py-1 text-sm font-medium"
                  ><Badge
                    aria-hidden="true"
                    :value="
                      groups.findIndex((group) => group.key === 'charts') + 1 ||
                      '−'
                    "
                    severity="contrast"
                    class="size-5 min-w-5 rounded-full p-0 leading-5"
                  /><span>{{ t('songList.charts') }}</span></InputGroupAddon
                ><Button
                  v-for="difficulty in [1, 2, 3, 4]"
                  :key="difficulty"
                  :aria-label="getOptionLabel(difficulty, 'difficulty')"
                  type="button"
                  size="small"
                  class="h-auto min-h-8 px-2 py-1 text-sm"
                  :severity="
                    chartDifficulties.includes(difficulty)
                      ? 'primary'
                      : 'secondary'
                  "
                  :outlined="!chartDifficulties.includes(difficulty)"
                  :aria-pressed="chartDifficulties.includes(difficulty)"
                  @click="
                    toggleDifficulty(
                      difficulty,
                      !chartDifficulties.includes(difficulty),
                    )
                  "
                  >{{ getOptionLabel(difficulty, 'difficulty') }}</Button
                ></InputGroup
              >
              <Button
                v-for="field in additionalFields"
                :key="field"
                :aria-label="t(`songList.field.${field}`)"
                type="button"
                size="small"
                class="h-8 max-w-full gap-1.5 rounded px-2 py-1 text-sm"
                :severity="fields.includes(field) ? 'primary' : 'secondary'"
                :outlined="!fields.includes(field)"
                :aria-pressed="fields.includes(field)"
                @click="toggleField(field, !fields.includes(field))"
              >
                <Badge
                  :value="
                    groups.findIndex((group) => group.key === field) + 1 || '−'
                  "
                  severity="contrast"
                  aria-hidden="true"
                  class="size-5 min-w-5 rounded-full p-0 leading-5"
                />
                <span>{{ t(`songList.field.${field}`) }}</span>
              </Button>
            </div></AccordionContent
          >
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
      class="mx-auto grid w-full list-none grid-cols-[repeat(auto-fill,minmax(min(100%,21.875rem),1fr))] gap-5 p-0"
      :aria-label="t('songs')"
    >
      <SongListItem
        v-for="song in visibleSongs"
        :key="song.id"
        :song="song"
        :payload="payload"
        :fields="fields"
        :chart-difficulties="chartDifficulties"
        :game-locale="gameLocale"
      />
    </ul>
  </template>
</template>
