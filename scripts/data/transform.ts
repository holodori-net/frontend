import type { DatabaseSync } from 'node:sqlite'
import { gameLocales } from '../../shared/language.ts'
import type {
  CardData,
  CardGrowthData,
  CharacterGroupData,
  CharacterData,
  LocalizedText,
} from '../../shared/game-data.ts'

function localizedText(
  database: DatabaseSync,
  table: 'LangCharacter' | 'LangCard' | 'LangCharacterGrouping',
  id: string,
  sourceTable: string,
  field: string,
  rowId: string,
): LocalizedText {
  const rows = database
    .prepare(`SELECT language, text FROM ${table} WHERE id = ?`)
    .all(id) as { language: string; text: string | null }[]
  return Object.fromEntries(
    gameLocales.map((locale) => {
      const translation = rows.find((row) => row.language === locale)
      if (!translation || translation.text === null) {
        throw new Error(
          `Missing ${locale} translation in ${table} for ${id} (${sourceTable}.${field} in row ${rowId})`,
        )
      }
      return [locale, translation.text]
    }),
  ) as LocalizedText
}

function parseJsonArray(
  value: string | null,
  table: string,
  field: string,
  id: string,
): string[] {
  if (value === null) return []
  try {
    return JSON.parse(value) as string[]
  } catch (cause) {
    throw new Error(`Invalid JSON in ${table}.${field} for row ${id}`, {
      cause,
    })
  }
}

export function transformCharacters(database: DatabaseSync): CharacterData[] {
  const rows = database
    .prepare(
      `SELECT id, name_lang_id, asset_id, is_playable, regular_character_grouping_ids, "order"
       FROM Character ORDER BY "order", id`,
    )
    .all() as {
    id: string
    name_lang_id: string
    asset_id: string | null
    is_playable: number
    regular_character_grouping_ids: string | null
    order: number
  }[]

  return rows.map((row) => ({
    id: row.id,
    name: localizedText(
      database,
      'LangCharacter',
      row.name_lang_id,
      'Character',
      'name_lang_id',
      row.id,
    ),
    assetId: row.asset_id,
    isPlayable: Boolean(row.is_playable),
    regularGroupIds: parseJsonArray(
      row.regular_character_grouping_ids,
      'Character',
      'regular_character_grouping_ids',
      row.id,
    ),
    order: row.order,
  }))
}

export function transformCharacterGroups(
  database: DatabaseSync,
): CharacterGroupData[] {
  const rows = database
    .prepare(
      `SELECT id, name_lang_id, description_lang_id, is_regular, character_ids,
              asset_id, color1, color2, "order"
       FROM CharacterGrouping ORDER BY "order", id`,
    )
    .all() as {
    id: string
    name_lang_id: string
    description_lang_id: string
    is_regular: number | null
    character_ids: string | null
    asset_id: string
    color1: string
    color2: string
    order: number
  }[]

  return rows.map((row) => ({
    id: row.id,
    name: localizedText(
      database,
      'LangCharacterGrouping',
      row.name_lang_id,
      'CharacterGrouping',
      'name_lang_id',
      row.id,
    ),
    description: localizedText(
      database,
      'LangCharacterGrouping',
      row.description_lang_id,
      'CharacterGrouping',
      'description_lang_id',
      row.id,
    ),
    isRegular: Boolean(row.is_regular),
    characterIds: parseJsonArray(
      row.character_ids,
      'CharacterGrouping',
      'character_ids',
      row.id,
    ),
    assetId: row.asset_id,
    color1: row.color1,
    color2: row.color2,
    order: row.order,
  }))
}

export function transformCards(database: DatabaseSync): CardData[] {
  const rows = database
    .prepare(
      `SELECT id, character_id, name_lang_id, rarity, attribute_type, asset_id,
              asset_type, vertical_anchor_type, horizontal_anchor_type, "order",
              card_level_group_id, card_level_limit_group_id,
              card_potential_group_id, performance_permil_multiply,
              technique_permil_multiply, sense_permil_multiply
       FROM Card ORDER BY "order", id`,
    )
    .all() as {
    id: string
    character_id: string
    name_lang_id: string
    rarity: number
    attribute_type: number
    asset_id: string | null
    asset_type: number
    vertical_anchor_type: number
    horizontal_anchor_type: number
    order: number
    card_level_group_id: string
    card_level_limit_group_id: string
    card_potential_group_id: string
    performance_permil_multiply: number
    technique_permil_multiply: number
    sense_permil_multiply: number
  }[]

  return rows.map((row) => ({
    id: row.id,
    characterId: row.character_id,
    name: localizedText(
      database,
      'LangCard',
      row.name_lang_id,
      'Card',
      'name_lang_id',
      row.id,
    ),
    rarity: row.rarity,
    attributeType: row.attribute_type,
    assetId: row.asset_id,
    assetType: row.asset_type,
    verticalAnchorType: row.vertical_anchor_type,
    horizontalAnchorType: row.horizontal_anchor_type,
    order: row.order,
    growth: {
      levelGroupId: row.card_level_group_id,
      levelLimitGroupId: row.card_level_limit_group_id,
      potentialGroupId: row.card_potential_group_id,
      weightsPermil: {
        performance: row.performance_permil_multiply,
        technique: row.technique_permil_multiply,
        sense: row.sense_permil_multiply,
      },
    },
  }))
}

export function transformCardGrowth(database: DatabaseSync): CardGrowthData {
  const levels = database
    .prepare(
      'SELECT group_id, level, parameter_base_value FROM CardLevel ORDER BY group_id, level',
    )
    .all() as {
    group_id: string
    level: number
    parameter_base_value: string | number
  }[]
  const levelLimits = database
    .prepare(
      'SELECT group_id, limit_break_count, level_limit FROM CardLevelLimit ORDER BY group_id, limit_break_count',
    )
    .all() as {
    group_id: string
    limit_break_count: number
    level_limit: number
  }[]
  const potentials = database
    .prepare(
      'SELECT group_id, upgrade_count, effect_type, value FROM CardPotential ORDER BY group_id, upgrade_count, effect_type',
    )
    .all() as {
    group_id: string
    upgrade_count: number
    effect_type: number
    value: string | number
  }[]

  return {
    levels: groupRows(levels, (row) => ({
      level: row.level,
      parameterBaseValue: Number(row.parameter_base_value),
    })),
    levelLimits: groupRows(levelLimits, (row) => ({
      limitBreakCount: row.limit_break_count,
      levelLimit: row.level_limit,
    })),
    potentials: groupRows(potentials, (row) => ({
      upgradeCount: row.upgrade_count,
      effectType: row.effect_type,
      value: Number(row.value),
    })),
  }
}

function groupRows<T extends { group_id: string }, Result>(
  rows: T[],
  map: (row: T) => Result,
): Record<string, Result[]> {
  const groups: Record<string, Result[]> = {}
  for (const row of rows) {
    ;(groups[row.group_id] ??= []).push(map(row))
  }
  return groups
}
