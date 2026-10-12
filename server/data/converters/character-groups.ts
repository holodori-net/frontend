import { asc, eq, sql } from 'drizzle-orm'
import type { CharacterGroupData } from '#shared/game-data/character-groups'
import { localizedText } from '../common/localized-text.ts'
import type { GameDatabase } from '../database.ts'
import { parseJsonArray } from '../common/json-array.ts'
import {
  characterGrouping,
  langCharacterGrouping,
} from '../schema/character-groups.ts'

export function transformCharacterGroups(
  database: GameDatabase,
): CharacterGroupData[] {
  const rows = database
    .select({
      id: characterGrouping.id,
      nameLangId: characterGrouping.nameLangId,
      descriptionLangId: characterGrouping.descriptionLangId,
      isRegular: characterGrouping.isRegular,
      characterIds: characterGrouping.characterIds,
      assetId: characterGrouping.assetId,
      color1: characterGrouping.color1,
      color2: characterGrouping.color2,
      order: characterGrouping.order,
    })
    .from(characterGrouping)
    .orderBy(asc(characterGrouping.order), asc(characterGrouping.id))
    .all()
  const languageQuery = database
    .select({
      language: langCharacterGrouping.language,
      text: langCharacterGrouping.text,
    })
    .from(langCharacterGrouping)
    .where(eq(langCharacterGrouping.id, sql.placeholder('id')))
    .prepare()

  const textFor = (id: string, field: string, rowId: string) =>
    localizedText(languageQuery.all({ id }), id, {
      languageTable: 'LangCharacterGrouping',
      table: 'CharacterGrouping',
      field,
      rowId,
    })

  return rows.map((row) => ({
    id: row.id,
    name: textFor(row.nameLangId, 'name_lang_id', row.id),
    description: textFor(row.descriptionLangId, 'description_lang_id', row.id),
    isRegular: Boolean(row.isRegular),
    characterIds: parseJsonArray(row.characterIds, {
      table: 'CharacterGrouping',
      field: 'character_ids',
      rowId: row.id,
    }),
    assetId: row.assetId,
    color1: row.color1,
    color2: row.color2,
    order: row.order,
  }))
}
