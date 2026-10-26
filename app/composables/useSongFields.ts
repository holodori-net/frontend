import { computed, readonly } from 'vue'
import {
  SONG_LIST_FIELDS,
  type SongListField,
} from '#shared/game-data/song-list'

const STORAGE_KEY = 'holodori-song-fields'
type Preference = { fields: SongListField[] }

const defaultPreference = (): Preference => ({
  fields: [...SONG_LIST_FIELDS],
})

function isField(value: unknown): value is SongListField {
  return (
    typeof value === 'string' &&
    SONG_LIST_FIELDS.includes(value as SongListField)
  )
}

function normalize(fields: readonly SongListField[]): Preference {
  const selected = new Set(fields)
  return { fields: SONG_LIST_FIELDS.filter((field) => selected.has(field)) }
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
      !parsed.fields.every((field) => typeof field === 'string')
    ) {
      return defaultPreference()
    }
    const fields = parsed.fields.filter(isField)
    const hadLegacyFields = parsed.fields.some((field) =>
      ['credits', 'scoring', 'copyright'].includes(field as string),
    )
    if (hadLegacyFields) {
      for (const field of ['notes', 'streamingMute'] as const) {
        if (!fields.includes(field)) fields.push(field)
      }
    }
    return normalize(fields)
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
  const initializedState = useState<boolean>(
    'song-list-fields-initialized',
    () => false,
  )

  function update(fields: readonly SongListField[], persist: boolean) {
    const normalized = normalize(fields)
    fieldsState.value = normalized.fields
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
      update(
        readStoredPreference(localStorage.getItem(STORAGE_KEY)).fields,
        false,
      )
    } catch (error) {
      console.warn('Holodori song fields preference could not be read', error)
      update(defaultPreference().fields, false)
    } finally {
      initializedState.value = true
    }
  })

  function toggleField(field: SongListField, enabled: boolean) {
    const selected = fieldsState.value.includes(field)
    if (selected === enabled) return
    const fields = fieldsState.value.filter((item) => item !== field)
    if (enabled) fields.push(field)
    update(fields, true)
  }

  function reset() {
    update(defaultPreference().fields, true)
  }

  return {
    fields: computed(() => fieldsState.value),
    toggleField,
    reset,
    initialized: readonly(initializedState),
  }
}
