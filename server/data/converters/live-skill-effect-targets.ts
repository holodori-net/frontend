import type { DatabaseSync } from 'node:sqlite'
import type { LiveSkillEffectTargetData } from '#shared/game-data/live-skill-effect-targets'
import { localizedText } from '../common/localized-text.ts'

export function transformLiveSkillEffectTargets(
  database: DatabaseSync,
): LiveSkillEffectTargetData[] {
  const rows = database
    .prepare(
      `SELECT id, type, target_count, character_id, character_grouping_id,
              card_attribute_type, description_lang_id
       FROM LiveSkillEffectTarget ORDER BY id`,
    )
    .all() as {
    id: string
    type: number
    target_count: number | null
    character_id: string | null
    character_grouping_id: string | null
    card_attribute_type: number | null
    description_lang_id: string
  }[]
  const languageStatement = database.prepare(
    'SELECT language, text FROM LangGeneratedLiveSkillEffectTarget WHERE id = ?',
  )

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    targetCount: row.target_count,
    characterId: row.character_id,
    characterGroupingId: row.character_grouping_id,
    cardAttributeType: row.card_attribute_type,
    description: localizedText(languageStatement, row.description_lang_id, {
      languageTable: 'LangGeneratedLiveSkillEffectTarget',
      table: 'LiveSkillEffectTarget',
      field: 'description_lang_id',
      rowId: row.id,
    }),
  }))
}
