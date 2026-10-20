import { asc } from 'drizzle-orm'
import { gameLocales } from '#shared/language'
import type { LocalizedText } from '#shared/game-data/localized-text.ts'
import type {
  CardSkillData,
  LiveActiveSkillEffectData,
} from '#shared/game-data/card-skills.ts'
import type { ConfirmedDescriptionTemplates } from '#shared/game-data/live-skills.ts'
import type { GameDatabase } from '../database.ts'
import {
  langGeneratedLiveActiveSkillEffect,
  langGeneratedLiveActiveSkillLevel,
  langGeneratedLivePassiveSkillLevel,
  langGeneratedLiveSpecialSkillLevel,
  liveActiveSkill,
  liveActiveSkillEffect,
  liveActiveSkillLevel,
  livePassiveSkill,
  livePassiveSkillLevel,
  liveSpecialSkill,
  liveSpecialSkillLevel,
} from '../schema/card-skills.ts'
import { makeTextQuery, sourceText } from './live-skill-common.ts'
import { transformLiveSkillDescriptions } from './live-skill-descriptions.ts'
import {
  composeActiveSkillDescription,
  composePassiveSkillDescription,
  composeSpecialSkillDescription,
} from '#shared/game-data/live-skill-description'
import {
  inferSkillDescription,
  reportPendingDescription,
  type DescriptionCandidate,
} from '../live-skill-descriptions.ts'

function validateLevelTranslations(
  database: GameDatabase,
  rows: { id: string; descriptionLangId: string; level: number }[],
  table: string,
  languageTableName: string,
  languageTable:
    | typeof langGeneratedLivePassiveSkillLevel
    | typeof langGeneratedLiveActiveSkillLevel
    | typeof langGeneratedLiveSpecialSkillLevel,
  ownerField: string,
) {
  const query = makeTextQuery(database, languageTable)
  for (const row of rows) {
    sourceText(
      query.all({ id: row.descriptionLangId }),
      row.descriptionLangId,
      languageTableName,
      table,
      'description_lang_id',
      `${ownerField}=${row.id} level=${row.level}`,
    )
  }
}

function groupLevels<T extends { id: string }, U extends { level: number }>(
  rows: T[],
  toData: (row: T) => U,
) {
  const groups: Record<string, U[]> = {}
  for (const row of rows) (groups[row.id] ??= []).push(toData(row))
  for (const group of Object.values(groups))
    group.sort((left, right) => left.level - right.level)
  return groups
}

const probabilityLabels: Record<string, LocalizedText> = {
  '370': {
    jpn: '低確率',
    eng: 'Low Probability',
    ind: 'Peluang Rendah',
    kor: '낮은 확률',
    cht: '低機率',
    chs: '低概率',
  },
  '460': {
    jpn: '中確率',
    eng: 'Medium Probability',
    ind: 'Peluang Sedang',
    kor: '중간 확률',
    cht: '中機率',
    chs: '中等概率',
  },
  '550': {
    jpn: '高確率',
    eng: 'High Probability',
    ind: 'Peluang Tinggi',
    kor: '높은 확률',
    cht: '高機率',
    chs: '高概率',
  },
}

export function transformCardSkillData(
  database: GameDatabase,
  confirmedTemplates?: ConfirmedDescriptionTemplates,
): CardSkillData {
  const descriptions = transformLiveSkillDescriptions(
    database,
    confirmedTemplates,
  )
  const { catalog, pendingDescriptions, effects, triggers, targets } =
    descriptions
  catalog.labels.probability = probabilityLabels

  const passiveIds = new Set(
    database
      .select({ id: livePassiveSkill.id })
      .from(livePassiveSkill)
      .all()
      .map(({ id }) => id),
  )
  const passiveRows = database
    .select({
      id: livePassiveSkillLevel.livePassiveSkillId,
      level: livePassiveSkillLevel.level,
      liveSkillTriggerGroupId: livePassiveSkillLevel.liveSkillTriggerGroupId,
      livePassiveSkillEffectGroupId:
        livePassiveSkillLevel.livePassiveSkillEffectGroupId,
      additionalLiveSkillTriggerGroupId:
        livePassiveSkillLevel.additionalLiveSkillTriggerGroupId,
      additionalLivePassiveSkillEffectGroupId:
        livePassiveSkillLevel.additionalLivePassiveSkillEffectGroupId,
      descriptionLangId: livePassiveSkillLevel.descriptionLangId,
    })
    .from(livePassiveSkillLevel)
    .orderBy(
      asc(livePassiveSkillLevel.livePassiveSkillId),
      asc(livePassiveSkillLevel.level),
    )
    .all()
  validateLevelTranslations(
    database,
    passiveRows,
    'LivePassiveSkillLevel',
    'LangGeneratedLivePassiveSkillLevel',
    langGeneratedLivePassiveSkillLevel,
    'live_passive_skill_id',
  )
  const passiveSkills = groupLevels(passiveRows, (row) => {
    if (!passiveIds.has(row.id))
      throw new Error(
        `Missing LivePassiveSkill ${row.id} referenced by LivePassiveSkillLevel.live_passive_skill_id in row ${row.id} level=${row.level}`,
      )
    return {
      livePassiveSkillId: row.id,
      level: row.level,
      liveSkillTriggerGroupId: row.liveSkillTriggerGroupId,
      livePassiveSkillEffectGroupId: row.livePassiveSkillEffectGroupId,
      additionalLiveSkillTriggerGroupId: row.additionalLiveSkillTriggerGroupId,
      additionalLivePassiveSkillEffectGroupId:
        row.additionalLivePassiveSkillEffectGroupId,
    }
  })

  const activeIds = new Set(
    database
      .select({ id: liveActiveSkill.id })
      .from(liveActiveSkill)
      .all()
      .map(({ id }) => id),
  )
  const activeRows = database
    .select({
      id: liveActiveSkillLevel.liveActiveSkillId,
      level: liveActiveSkillLevel.level,
      liveSkillTriggerGroupId: liveActiveSkillLevel.liveSkillTriggerGroupId,
      liveActiveSkillEffectGroupId:
        liveActiveSkillLevel.liveActiveSkillEffectGroupId,
      additionalLiveSkillTriggerGroupId:
        liveActiveSkillLevel.additionalLiveSkillTriggerGroupId,
      additionalLiveActiveSkillEffectGroupId:
        liveActiveSkillLevel.additionalLiveActiveSkillEffectGroupId,
      coolTimeMillisecond: liveActiveSkillLevel.coolTimeMillisecond,
      activationProbabilityPermilMultiply:
        liveActiveSkillLevel.activationProbabilityPermilMultiply,
      limitCount: liveActiveSkillLevel.limitCount,
      effectDurationMillisecond: liveActiveSkillLevel.effectDurationMillisecond,
      descriptionLangId: liveActiveSkillLevel.descriptionLangId,
    })
    .from(liveActiveSkillLevel)
    .orderBy(
      asc(liveActiveSkillLevel.liveActiveSkillId),
      asc(liveActiveSkillLevel.level),
    )
    .all()
  validateLevelTranslations(
    database,
    activeRows,
    'LiveActiveSkillLevel',
    'LangGeneratedLiveActiveSkillLevel',
    langGeneratedLiveActiveSkillLevel,
    'live_active_skill_id',
  )
  const activeSkills = groupLevels(activeRows, (row) => {
    if (!activeIds.has(row.id))
      throw new Error(
        `Missing LiveActiveSkill ${row.id} referenced by LiveActiveSkillLevel.live_active_skill_id in row ${row.id} level=${row.level}`,
      )
    return {
      liveActiveSkillId: row.id,
      level: row.level,
      liveSkillTriggerGroupId: row.liveSkillTriggerGroupId,
      liveActiveSkillEffectGroupId: row.liveActiveSkillEffectGroupId,
      additionalLiveSkillTriggerGroupId: row.additionalLiveSkillTriggerGroupId,
      additionalLiveActiveSkillEffectGroupId:
        row.additionalLiveActiveSkillEffectGroupId,
      coolTimeMillisecond: row.coolTimeMillisecond,
      activationProbabilityPermilMultiply:
        row.activationProbabilityPermilMultiply,
      limitCount: row.limitCount,
      effectDurationMillisecond: row.effectDurationMillisecond,
    }
  })

  const specialIds = new Set(
    database
      .select({ id: liveSpecialSkill.id })
      .from(liveSpecialSkill)
      .all()
      .map(({ id }) => id),
  )
  const specialRows = database
    .select({
      id: liveSpecialSkillLevel.liveSpecialSkillId,
      level: liveSpecialSkillLevel.level,
      liveActiveSkillEffectGroupId:
        liveSpecialSkillLevel.liveActiveSkillEffectGroupId,
      additionalLiveSkillTriggerGroupId:
        liveSpecialSkillLevel.additionalLiveSkillTriggerGroupId,
      additionalLiveActiveSkillEffectGroupId:
        liveSpecialSkillLevel.additionalLiveActiveSkillEffectGroupId,
      effectDurationMillisecond:
        liveSpecialSkillLevel.effectDurationMillisecond,
      descriptionLangId: liveSpecialSkillLevel.descriptionLangId,
    })
    .from(liveSpecialSkillLevel)
    .orderBy(
      asc(liveSpecialSkillLevel.liveSpecialSkillId),
      asc(liveSpecialSkillLevel.level),
    )
    .all()
  validateLevelTranslations(
    database,
    specialRows,
    'LiveSpecialSkillLevel',
    'LangGeneratedLiveSpecialSkillLevel',
    langGeneratedLiveSpecialSkillLevel,
    'live_special_skill_id',
  )
  const specialSkills = groupLevels(specialRows, (row) => {
    if (!specialIds.has(row.id))
      throw new Error(
        `Missing LiveSpecialSkill ${row.id} referenced by LiveSpecialSkillLevel.live_special_skill_id in row ${row.id} level=${row.level}`,
      )
    return {
      liveSpecialSkillId: row.id,
      level: row.level,
      liveActiveSkillEffectGroupId: row.liveActiveSkillEffectGroupId,
      additionalLiveSkillTriggerGroupId: row.additionalLiveSkillTriggerGroupId,
      additionalLiveActiveSkillEffectGroupId:
        row.additionalLiveActiveSkillEffectGroupId,
      effectDurationMillisecond: row.effectDurationMillisecond,
    }
  })

  const activeEffectTextQuery = makeTextQuery(
    database,
    langGeneratedLiveActiveSkillEffect,
  )
  const activeEffectRows = database
    .select({
      groupId: liveActiveSkillEffect.groupId,
      number: liveActiveSkillEffect.number,
      type: liveActiveSkillEffect.type,
      value: liveActiveSkillEffect.value,
      scoreUpBasedOnParameterPermilMultiply:
        liveActiveSkillEffect.scoreUpBasedOnParameterPermilMultiply,
      descriptionLangId: liveActiveSkillEffect.descriptionLangId,
    })
    .from(liveActiveSkillEffect)
    .orderBy(
      asc(liveActiveSkillEffect.groupId),
      asc(liveActiveSkillEffect.number),
    )
    .all()
  const activeEffects = groupEffectRows(
    activeEffectRows.map((row): LiveActiveSkillEffectData => {
      const key = `${row.groupId}:${row.number}`
      const text = sourceText(
        activeEffectTextQuery.all({ id: row.descriptionLangId }),
        row.descriptionLangId,
        'LangGeneratedLiveActiveSkillEffect',
        'LiveActiveSkillEffect',
        'description_lang_id',
        key,
      )
      const candidates: DescriptionCandidate[] = []
      if ([1, 5, 6].includes(row.type) && row.value !== null)
        candidates.push(numberCandidate('percent', Number(row.value) / 10))
      if (row.type === 8 && row.value !== null)
        candidates.push({
          name: 'amount',
          value: row.value,
          text: Object.fromEntries(
            gameLocales.map((locale) => [locale, row.value]),
          ) as LocalizedText,
        })
      const known = [1, 5, 6, 8, 9].includes(row.type)
      const description = known
        ? inferSkillDescription(
            {
              domain: 'activeEffect',
              type: row.type,
              table: 'LiveActiveSkillEffect',
              key,
              text,
              candidates,
            },
            catalog,
            pendingDescriptions,
            confirmedTemplates,
          )
        : null
      if (!known)
        reportPendingDescription(pendingDescriptions, {
          table: 'LiveActiveSkillEffect',
          key,
          type: row.type,
          language: null,
          reason: 'Unknown active effect type',
        })
      return {
        groupId: row.groupId,
        number: row.number,
        type: row.type,
        value: row.value,
        scoreUpBasedOnParameterPermilMultiply:
          row.scoreUpBasedOnParameterPermilMultiply,
        description,
      }
    }),
  )

  const effectGroups = new Set(Object.keys(effects))
  const activeEffectGroups = new Set(Object.keys(activeEffects))
  const triggerGroups = new Set(Object.keys(triggers))
  for (const [skillId, rows] of Object.entries(passiveSkills))
    for (const row of rows) {
      requireGroup(
        effectGroups,
        row.livePassiveSkillEffectGroupId,
        'LivePassiveSkillLevel.live_passive_skill_effect_group_id',
        skillId,
        row.level,
      )
      requireOptionalGroup(
        triggerGroups,
        row.liveSkillTriggerGroupId,
        'LivePassiveSkillLevel.live_skill_trigger_group_id',
        skillId,
        row.level,
      )
      requireOptionalGroup(
        effectGroups,
        row.additionalLivePassiveSkillEffectGroupId,
        'LivePassiveSkillLevel.additional_live_passive_skill_effect_group_id',
        skillId,
        row.level,
      )
      requireOptionalGroup(
        triggerGroups,
        row.additionalLiveSkillTriggerGroupId,
        'LivePassiveSkillLevel.additional_live_skill_trigger_group_id',
        skillId,
        row.level,
      )
    }
  for (const [skillId, rows] of Object.entries(activeSkills))
    for (const row of rows) {
      requireGroup(
        activeEffectGroups,
        row.liveActiveSkillEffectGroupId,
        'LiveActiveSkillLevel.live_active_skill_effect_group_id',
        skillId,
        row.level,
      )
      requireOptionalGroup(
        triggerGroups,
        row.liveSkillTriggerGroupId,
        'LiveActiveSkillLevel.live_skill_trigger_group_id',
        skillId,
        row.level,
      )
      requireOptionalGroup(
        activeEffectGroups,
        row.additionalLiveActiveSkillEffectGroupId,
        'LiveActiveSkillLevel.additional_live_active_skill_effect_group_id',
        skillId,
        row.level,
      )
      requireOptionalGroup(
        triggerGroups,
        row.additionalLiveSkillTriggerGroupId,
        'LiveActiveSkillLevel.additional_live_skill_trigger_group_id',
        skillId,
        row.level,
      )
    }
  for (const [skillId, rows] of Object.entries(specialSkills))
    for (const row of rows) {
      requireGroup(
        activeEffectGroups,
        row.liveActiveSkillEffectGroupId,
        'LiveSpecialSkillLevel.live_active_skill_effect_group_id',
        skillId,
        row.level,
      )
      requireOptionalGroup(
        triggerGroups,
        row.additionalLiveSkillTriggerGroupId,
        'LiveSpecialSkillLevel.additional_live_skill_trigger_group_id',
        skillId,
        row.level,
      )
      requireOptionalGroup(
        activeEffectGroups,
        row.additionalLiveActiveSkillEffectGroupId,
        'LiveSpecialSkillLevel.additional_live_active_skill_effect_group_id',
        skillId,
        row.level,
      )
    }

  const data: CardSkillData = {
    passiveSkills,
    activeSkills,
    specialSkills,
    effects,
    activeEffects,
    triggers,
    targets,
    catalog,
    pendingDescriptions,
  }

  for (const rows of Object.values(data.passiveSkills))
    for (const row of rows)
      for (const language of gameLocales)
        composePassiveSkillDescription(row, data, language, (reason) =>
          reportPendingDescription(pendingDescriptions, {
            table: 'LivePassiveSkillLevel',
            key: `${row.livePassiveSkillId}:${row.level}`,
            type: null,
            language,
            reason,
          }),
        )

  for (const rows of Object.values(data.activeSkills))
    for (const row of rows)
      for (const language of gameLocales)
        composeActiveSkillDescription(row, data, language, (reason) =>
          reportPendingDescription(pendingDescriptions, {
            table: 'LiveActiveSkillLevel',
            key: `${row.liveActiveSkillId}:${row.level}`,
            type: null,
            language,
            reason,
          }),
        )

  for (const rows of Object.values(data.specialSkills))
    for (const row of rows)
      for (const language of gameLocales)
        composeSpecialSkillDescription(row, data, language, (reason) =>
          reportPendingDescription(pendingDescriptions, {
            table: 'LiveSpecialSkillLevel',
            key: `${row.liveSpecialSkillId}:${row.level}`,
            type: null,
            language,
            reason,
          }),
        )

  return data
}

function numberCandidate(name: string, value: number): DescriptionCandidate {
  return {
    name,
    value,
    text: Object.fromEntries(
      gameLocales.map((locale) => [locale, String(value)]),
    ) as LocalizedText,
  }
}

function groupEffectRows<T extends { groupId: string; number: number }>(
  rows: T[],
): Record<string, T[]> {
  const groups: Record<string, T[]> = {}
  for (const row of rows) (groups[row.groupId] ??= []).push(row)
  for (const group of Object.values(groups))
    group.sort((left, right) => left.number - right.number)
  return groups
}

function requireGroup(
  groups: Set<string>,
  id: string,
  field: string,
  skillId: string,
  level: number,
) {
  if (!groups.has(id))
    throw new Error(
      `Missing group ${id} referenced by ${field} in row ${skillId} level=${level}`,
    )
}

function requireOptionalGroup(
  groups: Set<string>,
  id: string | null,
  field: string,
  skillId: string,
  level: number,
) {
  if (id !== null) requireGroup(groups, id, field, skillId, level)
}
