import { computed, readonly } from 'vue'
import {
  CARD_LIST_FIELDS,
  type CardListField,
} from '#shared/game-data/card-list'

const STORAGE_KEY = 'holodori-card-fields'

function parseCardFields(value: string | null): CardListField[] {
  if (value === null) return [...CARD_LIST_FIELDS]

  try {
    const parsed: unknown = JSON.parse(value)
    if (
      !Array.isArray(parsed) ||
      !parsed.every(
        (field): field is CardListField =>
          typeof field === 'string' &&
          CARD_LIST_FIELDS.includes(field as CardListField),
      )
    ) {
      return [...CARD_LIST_FIELDS]
    }

    const selected = new Set(parsed)
    return CARD_LIST_FIELDS.filter((field) => selected.has(field))
  } catch {
    return [...CARD_LIST_FIELDS]
  }
}

export function useCardFields() {
  const fieldsState = useState<CardListField[]>('card-list-fields', () => [
    ...CARD_LIST_FIELDS,
  ])
  const initializedState = useState<boolean>(
    'card-list-fields-initialized',
    () => false,
  )

  const fields = computed({
    get: () => fieldsState.value,
    set: (value: CardListField[]) => {
      const selected = new Set(value)
      fieldsState.value = CARD_LIST_FIELDS.filter((field) =>
        selected.has(field),
      )
      if (!initializedState.value) return

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fieldsState.value))
      } catch (error) {
        console.warn(
          'Holodori card fields preference could not be saved',
          error,
        )
      }
    },
  })

  onMounted(() => {
    if (initializedState.value) return

    try {
      fieldsState.value = parseCardFields(localStorage.getItem(STORAGE_KEY))
    } catch (error) {
      console.warn('Holodori card fields preference could not be read', error)
      fieldsState.value = [...CARD_LIST_FIELDS]
    } finally {
      initializedState.value = true
    }
  })

  return { fields, initialized: readonly(initializedState) }
}
