import type { DatabaseSync } from 'node:sqlite'
import type { CharacterGroupData } from '../../../shared/game-data/character-groups.ts'
import { localizedText } from '../common/localized-text.ts'
import { parseJsonArray } from '../common/json-array.ts'
import type { TransformModule } from '../contract.ts'

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
  const languageStatement = database.prepare(
    'SELECT language, text FROM LangCharacterGrouping WHERE id = ?',
  )

  return rows.map((row) => ({
    id: row.id,
    name: localizedText(languageStatement, row.name_lang_id, {
      languageTable: 'LangCharacterGrouping',
      table: 'CharacterGrouping',
      field: 'name_lang_id',
      rowId: row.id,
    }),
    description: localizedText(languageStatement, row.description_lang_id, {
      languageTable: 'LangCharacterGrouping',
      table: 'CharacterGrouping',
      field: 'description_lang_id',
      rowId: row.id,
    }),
    isRegular: Boolean(row.is_regular),
    characterIds: parseJsonArray(row.character_ids, {
      table: 'CharacterGrouping',
      field: 'character_ids',
      rowId: row.id,
    }),
    assetId: row.asset_id,
    color1: row.color1,
    color2: row.color2,
    order: row.order,
  }))
}

export const characterGroupsTransform: TransformModule<CharacterGroupData[]> = {
  fileName: 'character-groups.json',
  run(database) {
    const data = transformCharacterGroups(database)
    return { data, summary: `${data.length} character groups` }
  },
}
