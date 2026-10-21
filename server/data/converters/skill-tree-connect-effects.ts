import { asc, eq, sql } from 'drizzle-orm'
import type {
  SkillTreeConnectData,
  SkillTreeConnectEffectData,
} from '#shared/game-data/skill-tree-connect-effects'
import { localizedText } from '../common/localized-text.ts'
import type { GameDatabase } from '../database.ts'
import {
  langGeneratedSkillTreeConnectEffect,
  skillTreeConnectEffect,
  skillTreeConnectEffectExtent,
} from '../schema/skill-tree-connect-effects.ts'

export function transformSkillTreeConnectEffects(
  database: GameDatabase,
): SkillTreeConnectData {
  const rows = database
    .select({
      id: skillTreeConnectEffect.id,
      level: skillTreeConnectEffect.level,
      connectEffectType: skillTreeConnectEffect.connectEffectType,
      extentGroupId: skillTreeConnectEffect.skillTreeConnectEffectExtentGroupId,
      effectPermilUp: skillTreeConnectEffect.effectPermilUp,
      additionalSkillTreeEffectId:
        skillTreeConnectEffect.additionalSkillTreeEffectId,
      targetSkillTreeEffectId: skillTreeConnectEffect.targetSkillTreeEffectId,
      targetNodeType: skillTreeConnectEffect.targetNodeType,
      targetNodeGrade: skillTreeConnectEffect.targetNodeGrade,
      descriptionLangId: skillTreeConnectEffect.descriptionLangId,
    })
    .from(skillTreeConnectEffect)
    .orderBy(asc(skillTreeConnectEffect.id), asc(skillTreeConnectEffect.level))
    .all()

  const extentRows = database
    .select({
      groupId: skillTreeConnectEffectExtent.groupId,
      x: skillTreeConnectEffectExtent.positionX,
      y: skillTreeConnectEffectExtent.positionY,
    })
    .from(skillTreeConnectEffectExtent)
    .orderBy(
      asc(skillTreeConnectEffectExtent.groupId),
      asc(skillTreeConnectEffectExtent.positionY),
      asc(skillTreeConnectEffectExtent.positionX),
    )
    .all()
  const extents: SkillTreeConnectData['extents'] = {}
  for (const row of extentRows)
    (extents[row.groupId] ??= []).push({ x: row.x, y: row.y })

  const languageQuery = database
    .select({
      language: langGeneratedSkillTreeConnectEffect.language,
      text: langGeneratedSkillTreeConnectEffect.text,
    })
    .from(langGeneratedSkillTreeConnectEffect)
    .where(eq(langGeneratedSkillTreeConnectEffect.id, sql.placeholder('id')))
    .prepare()

  const effects: SkillTreeConnectData['effects'] = {}
  for (const row of rows) {
    if (!extents[row.extentGroupId]?.length)
      throw new Error(
        `Missing or empty SkillTreeConnectEffectExtent.group_id ${row.extentGroupId} referenced by SkillTreeConnectEffect.skill_tree_connect_effect_extent_group_id in row ${row.id} level=${row.level}`,
      )
    const effect: SkillTreeConnectEffectData = {
      id: row.id,
      level: row.level,
      connectEffectType: row.connectEffectType,
      skillTreeConnectEffectExtentGroupId: row.extentGroupId,
      effectPermilUp: row.effectPermilUp,
      additionalSkillTreeEffectId: row.additionalSkillTreeEffectId,
      targetSkillTreeEffectId: row.targetSkillTreeEffectId,
      targetNodeType: row.targetNodeType,
      targetNodeGrade: row.targetNodeGrade,
      description: localizedText(
        languageQuery.all({ id: row.descriptionLangId }),
        row.descriptionLangId,
        {
          languageTable: 'LangGeneratedSkillTreeConnectEffect',
          table: 'SkillTreeConnectEffect',
          field: 'description_lang_id',
          rowId: `${row.id} level=${row.level}`,
        },
      ),
    }
    const group = (effects[row.id] ??= [])
    group.push(effect)
  }

  return { effects, extents }
}
