import { computed, readonly } from 'vue'
import {
  getSongListFieldGroups,
  SONG_LIST_FIELDS,
  type SongListField,
} from '#shared/game-data/song-list'

const STORAGE_KEY = 'holodori-song-fields'
export const SONG_CHART_DIFFICULTIES = [1, 2, 3, 4] as const
type Preference = { fields: SongListField[]; chartDifficulties: number[] }

const defaultPreference = (): Preference => ({
  fields: [...SONG_LIST_FIELDS].filter((field) =>
    ['title', 'singer', 'category', 'duration', 'charts', 'credits'].includes(
      field,
    ),
  ),
  chartDifficulties: [...SONG_CHART_DIFFICULTIES],
})

function isField(value: unknown): value is SongListField {
  return (
    typeof value === 'string' &&
    SONG_LIST_FIELDS.includes(value as SongListField)
  )
}

function normalize(
  fields: readonly SongListField[],
  difficulties: readonly number[],
): Preference {
  const chartDifficulties = [...new Set(difficulties)]
    .filter((level) =>
      (SONG_CHART_DIFFICULTIES as readonly number[]).includes(level),
    )
    .sort((a, b) => a - b)
  const selectedFields = [...new Set(fields)].filter(
    (field) => field !== 'charts' || chartDifficulties.length > 0,
  )
  if (chartDifficulties.length && !selectedFields.includes('charts')) {
    selectedFields.push('charts')
  }
  return {
    fields: getSongListFieldGroups(selectedFields).flatMap(
      (group) => group.fields,
    ),
    chartDifficulties,
  }
}

function readStoredPreference(stored: string | null): Preference {
  if (stored === null) return defaultPreference()
  try {
    const value: unknown = JSON.parse(stored)
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return defaultPreference()
    }
    const parsed = value as Record<string, unknown>
    if (
      !Array.isArray(parsed.fields) ||
      !parsed.fields.every(isField) ||
      !Array.isArray(parsed.chartDifficulties) ||
      !parsed.chartDifficulties.every(
        (item) => Number.isSafeInteger(item) && (item as number) > 0,
      )
    ) {
      return defaultPreference()
    }
    return normalize(parsed.fields, parsed.chartDifficulties as number[])
  } catch {
    return defaultPreference()
  }
}

export function useSongFields() {
  const initial = defaultPreference()
  const fieldsState = useState<SongListField[]>(
    'song-list-fields',
    () => initial.fields,
  )
  const difficultiesState = useState<number[]>(
    'song-list-chart-difficulties',
    () => initial.chartDifficulties,
  )
  const initializedState = useState<boolean>(
    'song-list-fields-initialized',
    () => false,
  )

  function update(next: Preference, persist: boolean) {
    const normalized = normalize(next.fields, next.chartDifficulties)
    fieldsState.value = normalized.fields
    difficultiesState.value = normalized.chartDifficulties
    if (!persist || !initializedState.value) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    } catch (error) {
      console.warn('Holodori song fields preference could not be saved', error)
    }
  }

  onMounted(() => {
    if (initializedState.value) return
    try {
      update(readStoredPreference(localStorage.getItem(STORAGE_KEY)), false)
    } catch (error) {
      console.warn('Holodori song fields preference could not be read', error)
      update(defaultPreference(), false)
    } finally {
      initializedState.value = true
    }
  })

  function toggleField(field: SongListField, enabled: boolean) {
    const selected = fieldsState.value.includes(field)
    if (selected === enabled) return
    if (field === 'charts') {
      update(
        {
          fields: enabled
            ? [...fieldsState.value, field]
            : fieldsState.value.filter((item) => item !== field),
          chartDifficulties: enabled ? [...SONG_CHART_DIFFICULTIES] : [],
        },
        true,
      )
      return
    }
    const fields = fieldsState.value.filter((item) => item !== field)
    if (enabled) fields.push(field)
    update({ fields, chartDifficulties: difficultiesState.value }, true)
  }

  function toggleDifficulty(difficulty: number, enabled: boolean) {
    if (!(SONG_CHART_DIFFICULTIES as readonly number[]).includes(difficulty))
      return
    const selected = difficultiesState.value.includes(difficulty)
    if (selected === enabled) return
    const chartDifficulties = enabled
      ? [...difficultiesState.value, difficulty].sort((a, b) => a - b)
      : difficultiesState.value.filter((item) => item !== difficulty)
    const fields = [...fieldsState.value]
    if (chartDifficulties.length === 0) {
      const index = fields.indexOf('charts')
      if (index >= 0) fields.splice(index, 1)
    } else if (!fields.includes('charts')) {
      fields.push('charts')
    }
    update({ fields, chartDifficulties }, true)
  }

  function reset() {
    update(defaultPreference(), true)
  }

  return {
    fields: computed(() => fieldsState.value),
    chartDifficulties: computed(() => difficultiesState.value),
    toggleField,
    toggleDifficulty,
    reset,
    initialized: readonly(initializedState),
  }
}
