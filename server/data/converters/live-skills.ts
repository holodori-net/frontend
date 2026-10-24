import { asc } from 'drizzle-orm'
import type {
  ConfirmedDescriptionTemplates,
  CostumeData,
  LiveLeaderSkillData,
  LiveSkillData,
} from '#shared/game-data/live-skills.ts'
import type { GameDatabase } from '../database.ts'
import { costume, langCostume, liveLeaderSkill } from '../schema/live-skills.ts'
import { makeTextQuery, sourceText } from './live-skill-common.ts'
import { transformLiveSkillDescriptions } from './live-skill-descriptions.ts'

export function transformLiveSkillData(
  database: GameDatabase,
  confirmedTemplates?: ConfirmedDescriptionTemplates,
): LiveSkillData {
  const {
    catalog,
    pendingDescriptions,
    effects,
    triggers,
    targets,
    characterIds,
  } = transformLiveSkillDescriptions(database, confirmedTemplates)
  const costumeData = transformCostumes(database)
  for (const row of costumeData) {
    if (!characterIds.has(row.characterId)) {
      throw new Error(
        `Missing Character ${row.characterId} referenced by Costume.character_id in row ${row.id}`,
      )
    }
  }

  const leaderSkills: LiveLeaderSkillData[] = database
    .select({
      id: liveLeaderSkill.id,
      liveSkillTriggerGroupId: liveLeaderSkill.liveSkillTriggerGroupId,
      livePassiveSkillEffectGroupId:
        liveLeaderSkill.livePassiveSkillEffectGroupId,
      additionalLiveSkillTriggerGroupId:
        liveLeaderSkill.additionalLiveSkillTriggerGroupId,
      additionalLivePassiveSkillEffectGroupId:
        liveLeaderSkill.additionalLivePassiveSkillEffectGroupId,
    })
    .from(liveLeaderSkill)
    .orderBy(asc(liveLeaderSkill.id))
    .all()

  const leaderSkillIds = new Set(leaderSkills.map(({ id }) => id))
  for (const row of costumeData) {
    if (
      row.liveLeaderSkillId !== null &&
      !leaderSkillIds.has(row.liveLeaderSkillId)
    ) {
      throw new Error(
        `Missing LiveLeaderSkill ${row.liveLeaderSkillId} referenced by Costume.live_leader_skill_id in row ${row.id}`,
      )
    }
  }
  const effectGroupIds = new Set(Object.keys(effects))
  const triggerGroupIds = new Set(Object.keys(triggers))
  for (const skill of leaderSkills) {
    if (!effectGroupIds.has(skill.livePassiveSkillEffectGroupId)) {
      throw new Error(
        `Missing LivePassiveSkillEffect group ${skill.livePassiveSkillEffectGroupId} referenced by LiveLeaderSkill.live_passive_skill_effect_group_id in row ${skill.id}`,
      )
    }
    if (
      skill.liveSkillTriggerGroupId !== null &&
      !triggerGroupIds.has(skill.liveSkillTriggerGroupId)
    ) {
      throw new Error(
        `Missing LiveSkillTrigger group ${skill.liveSkillTriggerGroupId} referenced by LiveLeaderSkill.live_skill_trigger_group_id in row ${skill.id}`,
      )
    }
    if (
      skill.additionalLivePassiveSkillEffectGroupId !== null &&
      !effectGroupIds.has(skill.additionalLivePassiveSkillEffectGroupId)
    ) {
      throw new Error(
        `Missing LivePassiveSkillEffect group ${skill.additionalLivePassiveSkillEffectGroupId} referenced by LiveLeaderSkill.additional_live_passive_skill_effect_group_id in row ${skill.id}`,
      )
    }
    if (
      skill.additionalLiveSkillTriggerGroupId !== null &&
      !triggerGroupIds.has(skill.additionalLiveSkillTriggerGroupId)
    ) {
      throw new Error(
        `Missing LiveSkillTrigger group ${skill.additionalLiveSkillTriggerGroupId} referenced by LiveLeaderSkill.additional_live_skill_trigger_group_id in row ${skill.id}`,
      )
    }
  }

  return {
    costumes: costumeData,
    leaderSkills,
    effects,
    triggers,
    targets,
    catalog,
    pendingDescriptions,
  }
}

export function transformCostumes(database: GameDatabase): CostumeData[] {
  const rows = database
    .select({
      id: costume.id,
      characterId: costume.characterId,
      assetId: costume.assetId,
      nameLangId: costume.nameLangId,
      liveLeaderSkillId: costume.liveLeaderSkillId,
    })
    .from(costume)
    .orderBy(asc(costume.id))
    .all()
  const textQuery = makeTextQuery(database, langCostume)
  return rows.map((row) => ({
    id: row.id,
    characterId: row.characterId,
    assetId: row.assetId,
    name: sourceText(
      textQuery.all({ id: row.nameLangId }),
      row.nameLangId,
      'LangCostume',
      'Costume',
      'name_lang_id',
      row.id,
    ),
    liveLeaderSkillId: row.liveLeaderSkillId,
  }))
}
