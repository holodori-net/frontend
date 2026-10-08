import type { DatabaseSync } from 'node:sqlite'
import type { CharacterData } from '../../../shared/game-data/characters.ts'
import { parseJsonArray } from '../common/json-array.ts'
import { localizedText } from '../common/localized-text.ts'
import type { TransformModule } from '../contract.ts'

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

  const nameStatement = database.prepare(
    'SELECT language, text FROM LangCharacter WHERE id = ?',
  )

  return rows.map((row) => ({
    id: row.id,
    name: localizedText(nameStatement, row.name_lang_id, {
      languageTable: 'LangCharacter',
      table: 'Character',
      field: 'name_lang_id',
      rowId: row.id,
    }),
    assetId: row.asset_id,
    isPlayable: Boolean(row.is_playable),
    regularGroupIds: parseJsonArray(row.regular_character_grouping_ids, {
      table: 'Character',
      field: 'regular_character_grouping_ids',
      rowId: row.id,
    }),
    order: row.order,
  }))
}

export const charactersTransform: TransformModule<CharacterData[]> = {
  fileName: 'characters.json',
  run(database) {
    const data = transformCharacters(database)
    return { data, summary: `${data.length} characters` }
  },
}
