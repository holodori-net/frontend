import { asc, eq, sql } from 'drizzle-orm'
import type { LiveSkillEffectTargetData } from '#shared/game-data/live-skill-effect-targets'
import { localizedText } from '../common/localized-text.ts'
import type { GameDatabase } from '../database.ts'
import {
  langGeneratedLiveSkillEffectTarget,
  liveSkillEffectTarget,
} from '../schema/live-skill-effect-targets.ts'

export function transformLiveSkillEffectTargets(
  database: GameDatabase,
): LiveSkillEffectTargetData[] {
  const rows = database
    .select({
      id: liveSkillEffectTarget.id,
      type: liveSkillEffectTarget.type,
      targetCount: liveSkillEffectTarget.targetCount,
      characterId: liveSkillEffectTarget.characterId,
      characterGroupingId: liveSkillEffectTarget.characterGroupingId,
      cardAttributeType: liveSkillEffectTarget.cardAttributeType,
      descriptionLangId: liveSkillEffectTarget.descriptionLangId,
    })
    .from(liveSkillEffectTarget)
    .orderBy(asc(liveSkillEffectTarget.id))
    .all()
  const languageQuery = database
    .select({
      language: langGeneratedLiveSkillEffectTarget.language,
      text: langGeneratedLiveSkillEffectTarget.text,
    })
    .from(langGeneratedLiveSkillEffectTarget)
    .where(eq(langGeneratedLiveSkillEffectTarget.id, sql.placeholder('id')))
    .prepare()

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    targetCount: row.targetCount,
    characterId: row.characterId,
    characterGroupingId: row.characterGroupingId,
    cardAttributeType: row.cardAttributeType,
    description: localizedText(
      languageQuery.all({ id: row.descriptionLangId }),
      row.descriptionLangId,
      {
        languageTable: 'LangGeneratedLiveSkillEffectTarget',
        table: 'LiveSkillEffectTarget',
        field: 'description_lang_id',
        rowId: row.id,
      },
    ),
  }))
}
