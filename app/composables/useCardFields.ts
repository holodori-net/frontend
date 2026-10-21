import { computed, readonly } from 'vue'
import {
  CARD_LIST_FIELDS,
  CARD_SKILL_FIELDS,
  type CardListField,
  type CardSkillField,
  type CardSkillLevelSelections,
} from '#shared/game-data/card-list'

const STORAGE_KEY = 'holodori-card-fields'
type Preference = {
  fields: CardListField[]
  skillLevels: CardSkillLevelSelections
}

function isSkillField(field: CardListField): field is CardSkillField {
  return (CARD_SKILL_FIELDS as readonly string[]).includes(field)
}

function emptySkillLevels(): CardSkillLevelSelections {
  return { passiveSkill: [], activeSkill: [], specialSkill: [] }
}

function normalizePreference(
  fields: readonly CardListField[],
  selectedLevels: CardSkillLevelSelections,
  availableLevels: CardSkillLevelSelections,
): Preference {
  const skillLevels = Object.fromEntries(
    CARD_SKILL_FIELDS.map((field) => [
      field,
      fields.includes(field)
        ? [
            ...new Set(
              selectedLevels[field].filter((level) =>
                availableLevels[field].includes(level),
              ),
            ),
          ].sort((left, right) => left - right)
        : [],
    ]),
  ) as CardSkillLevelSelections
  const normalizedFields = [...new Set(fields)].filter(
    (field) => !isSkillField(field) || skillLevels[field].length > 0,
  )
  return { fields: normalizedFields, skillLevels }
}

function defaultPreference(
  availableLevels: CardSkillLevelSelections,
): Preference {
  const skillLevels = emptySkillLevels()
  for (const field of CARD_SKILL_FIELDS) {
    if (availableLevels[field].includes(2)) skillLevels[field] = [2]
  }
  return normalizePreference(
    CARD_LIST_FIELDS.filter(
      (field) => !isSkillField(field) || skillLevels[field].length > 0,
    ),
    skillLevels,
    availableLevels,
  )
}

function isCardListField(value: unknown): value is CardListField {
  return (
    typeof value === 'string' &&
    CARD_LIST_FIELDS.includes(value as CardListField)
  )
}

function readStoredPreference(
  stored: string | null,
  availableLevels: CardSkillLevelSelections,
): Preference {
  const defaults = () => defaultPreference(availableLevels)
  if (stored === null) return defaults()

  try {
    const parsed: unknown = JSON.parse(stored)
    if (Array.isArray(parsed)) {
      if (!parsed.every(isCardListField)) return defaults()
      const fields = [...new Set(parsed)]
      const skillLevels = emptySkillLevels()
      for (const field of CARD_SKILL_FIELDS) {
        if (fields.includes(field) && availableLevels[field].includes(2)) {
          skillLevels[field] = [2]
        }
      }
      return normalizePreference(fields, skillLevels, availableLevels)
    }

    if (!parsed || typeof parsed !== 'object') return defaults()
    const value = parsed as Record<string, unknown>
    if (
      !Array.isArray(value.fields) ||
      !value.fields.every(isCardListField) ||
      !value.skillLevels ||
      typeof value.skillLevels !== 'object' ||
      Array.isArray(value.skillLevels)
    ) {
      return defaults()
    }

    const savedLevels = value.skillLevels as Record<string, unknown>
    if (
      Object.keys(savedLevels).some(
        (field) => !(CARD_SKILL_FIELDS as readonly string[]).includes(field),
      ) ||
      CARD_SKILL_FIELDS.some(
        (field) =>
          !Array.isArray(savedLevels[field]) ||
          !(savedLevels[field] as unknown[]).every(
            (level) => Number.isSafeInteger(level) && (level as number) > 0,
          ),
      )
    ) {
      return defaults()
    }

    const skillLevels = Object.fromEntries(
      CARD_SKILL_FIELDS.map((field) => [field, savedLevels[field] as number[]]),
    ) as CardSkillLevelSelections
    return normalizePreference(value.fields, skillLevels, availableLevels)
  } catch {
    return defaults()
  }
}

export function useCardFields(availableLevels: CardSkillLevelSelections) {
  const initial = defaultPreference(availableLevels)
  const fieldsState = useState<CardListField[]>(
    'card-list-fields',
    () => initial.fields,
  )
  const skillLevelsState = useState<CardSkillLevelSelections>(
    'card-list-skill-levels',
    () => initial.skillLevels,
  )
  const initializedState = useState<boolean>(
    'card-list-fields-initialized',
    () => false,
  )

  function update(next: Preference, persist: boolean) {
    const normalized = normalizePreference(
      next.fields,
      next.skillLevels,
      availableLevels,
    )
    fieldsState.value = normalized.fields
    skillLevelsState.value = normalized.skillLevels
    if (!persist || !initializedState.value) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    } catch (error) {
      console.warn('Holodori card fields preference could not be saved', error)
    }
  }

  const fields = computed(() => fieldsState.value)
  const skillLevels = computed(() => skillLevelsState.value)

  onMounted(() => {
    if (initializedState.value) return

    try {
      update(
        readStoredPreference(
          localStorage.getItem(STORAGE_KEY),
          availableLevels,
        ),
        false,
      )
    } catch (error) {
      console.warn('Holodori card fields preference could not be read', error)
      update(defaultPreference(availableLevels), false)
    } finally {
      initializedState.value = true
    }
  })

  function toggleField(field: CardListField, enabled: boolean) {
    if (isSkillField(field)) {
      const nextLevels = { ...skillLevelsState.value }
      nextLevels[field] = enabled ? [...availableLevels[field]] : []
      const hasField = fieldsState.value.includes(field)
      let nextFields = fieldsState.value
      if (enabled && nextLevels[field].length > 0 && !hasField) {
        nextFields = [...fieldsState.value, field]
      } else if ((!enabled || nextLevels[field].length === 0) && hasField) {
        nextFields = fieldsState.value.filter((item) => item !== field)
      }
      update({ fields: nextFields, skillLevels: nextLevels }, true)
      return
    }

    const selected = fieldsState.value.includes(field)
    if (selected === enabled) return
    const nextFields = fieldsState.value.filter((item) => item !== field)
    if (enabled) nextFields.push(field)
    update({ fields: nextFields, skillLevels: skillLevelsState.value }, true)
  }

  function toggleSkillLevel(
    field: CardSkillField,
    level: number,
    enabled: boolean,
  ) {
    if (!availableLevels[field].includes(level)) return
    const selected = skillLevelsState.value[field].includes(level)
    if (selected === enabled) return

    const nextLevels = { ...skillLevelsState.value }
    nextLevels[field] = enabled
      ? [...nextLevels[field], level].sort((left, right) => left - right)
      : nextLevels[field].filter((item) => item !== level)
    const hasField = fieldsState.value.includes(field)
    let nextFields = fieldsState.value
    if (nextLevels[field].length > 0 && !hasField) {
      nextFields = [...fieldsState.value, field]
    } else if (nextLevels[field].length === 0 && hasField) {
      nextFields = fieldsState.value.filter((item) => item !== field)
    }
    update({ fields: nextFields, skillLevels: nextLevels }, true)
  }

  return {
    fields: readonly(fields),
    skillLevels: readonly(skillLevels),
    initialized: readonly(initializedState),
    toggleField,
    toggleSkillLevel,
  }
}
