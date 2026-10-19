import { asc, eq, sql } from 'drizzle-orm'
import { gameLocales } from '#shared/language'
import type { LocalizedText } from '#shared/game-data/localized-text.ts'
import type {
  ConfirmedDescriptionTemplates,
  CostumeData,
  DescriptionCatalog,
  LiveLeaderSkillData,
  LivePassiveSkillEffectData,
  LiveSkillData,
  LiveSkillTargetData,
  LiveSkillTriggerData,
} from '#shared/game-data/live-skills.ts'
import type { LiveSkillEffectTargetData } from '#shared/game-data/live-skill-effect-targets.ts'
import { localizedText } from '../common/localized-text.ts'
import { parseJsonArray } from '../common/json-array.ts'
import type { GameDatabase } from '../database.ts'
import { character, langCharacter } from '../schema/characters.ts'
import {
  characterGrouping,
  langCharacterGrouping,
} from '../schema/character-groups.ts'
import {
  costume,
  langCostume,
  langGeneratedLivePassiveSkillEffect,
  langGeneratedLiveSkillTrigger,
  liveLeaderSkill,
  livePassiveSkillEffect,
  liveSkillTrigger,
} from '../schema/live-skills.ts'
import {
  inferSkillDescription,
  reportPendingDescription,
  type DescriptionCandidate,
} from '../live-skill-descriptions.ts'
import { transformLiveSkillEffectTargets } from './live-skill-effect-targets.ts'
import type { langGeneratedLiveSkillEffectTarget } from '../schema/live-skill-effect-targets.ts'

function sourceText(
  rows: { language: string; text: string | null }[],
  id: string,
  languageTable: string,
  table: string,
  field: string,
  rowId: string,
): LocalizedText {
  return localizedText(rows, id, { languageTable, table, field, rowId })
}

function makeTextQuery(
  database: GameDatabase,
  table:
    | typeof langCostume
    | typeof langCharacter
    | typeof langCharacterGrouping
    | typeof langGeneratedLivePassiveSkillEffect
    | typeof langGeneratedLiveSkillTrigger
    | typeof langGeneratedLiveSkillEffectTarget,
) {
  return database
    .select({ language: table.language, text: table.text })
    .from(table)
    .where(eq(table.id, sql.placeholder('id')))
    .prepare()
}

function sortGroups<T extends { groupId: string; number: number }>(rows: T[]) {
  const groups: Record<string, T[]> = {}
  for (const row of rows) (groups[row.groupId] ??= []).push(row)
  for (const group of Object.values(groups))
    group.sort((a, b) => a.number - b.number)
  return groups
}

function refCandidate(
  name: string,
  kind: 'character' | 'group',
  id: string,
  labels: DescriptionCatalog['labels'],
  table: string,
  field: string,
  rowId: string,
): DescriptionCandidate {
  const text = labels[kind][id]
  if (!text)
    throw new Error(
      `Missing ${kind} ${id} referenced by ${table}.${field} in row ${rowId}`,
    )
  return { name, value: { kind, id }, text }
}

function addAttributeLabels(
  descriptions: LocalizedText[],
  labels: DescriptionCatalog['labels'],
) {
  const found: Record<string, Partial<LocalizedText>> = {}
  for (const description of descriptions) {
    for (const locale of gameLocales) {
      for (const match of description[locale].matchAll(
        /\[attribute=([^\]]+)\]([^[]*?)\[\/attribute\]/g,
      )) {
        const id = match[1]!
        const text = match[0]!
        const current = (found[id] ??= {}) as Partial<LocalizedText>
        if (current[locale] === undefined) current[locale] = text
      }
    }
  }
  for (const [id, values] of Object.entries(found)) {
    if (gameLocales.every((locale) => values[locale] !== undefined)) {
      labels.attribute[id] = values as LocalizedText
    }
  }
}

function attributeCandidate(
  cardAttributeType: number | null,
  labels: DescriptionCatalog['labels'],
  attributeIds: Map<number, string>,
): DescriptionCandidate | null {
  if (cardAttributeType === null) return null
  const id = attributeIds.get(cardAttributeType)
  const text = id ? labels.attribute[id] : undefined
  return id && text
    ? { name: 'attribute', value: { kind: 'attribute', id }, text }
    : null
}

function createJudgementLabels(
  descriptions: Map<number, LocalizedText>,
  labels: DescriptionCatalog['labels'],
) {
  const tokens = { 3: 'GOOD', 4: 'GREAT', 5: 'PERFECT' } as const
  for (const [type, token] of Object.entries(tokens)) {
    const source = descriptions.get(Number(type))
    if (!source) continue
    const text = {} as LocalizedText
    let complete = true
    for (const locale of gameLocales) {
      const match = source[locale].match(new RegExp(token, 'i'))
      if (!match) {
        complete = false
        break
      }
      text[locale] = match[0]!
    }
    if (complete) labels.judgement[type] = text
  }
}

export function transformLiveSkillData(
  database: GameDatabase,
  confirmedTemplates?: ConfirmedDescriptionTemplates,
): LiveSkillData {
  const catalog: DescriptionCatalog = {
    templates: {},
    labels: { character: {}, group: {}, attribute: {}, judgement: {} },
  }
  const pendingDescriptions: LiveSkillData['pendingDescriptions'] = []

  const characterRows = database
    .select({ id: character.id, nameLangId: character.nameLangId })
    .from(character)
    .all()
  const characterIds = new Set(characterRows.map(({ id }) => id))
  const characterTextQuery = makeTextQuery(database, langCharacter)
  for (const row of characterRows) {
    catalog.labels.character[row.id] = sourceText(
      characterTextQuery.all({ id: row.nameLangId }),
      row.nameLangId,
      'LangCharacter',
      'Character',
      'name_lang_id',
      row.id,
    )
  }

  const groupRows = database
    .select({
      id: characterGrouping.id,
      nameLangId: characterGrouping.nameLangId,
    })
    .from(characterGrouping)
    .all()
  const groupTextQuery = makeTextQuery(database, langCharacterGrouping)
  for (const row of groupRows) {
    catalog.labels.group[row.id] = sourceText(
      groupTextQuery.all({ id: row.nameLangId }),
      row.nameLangId,
      'LangCharacterGrouping',
      'CharacterGrouping',
      'name_lang_id',
      row.id,
    )
  }

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

  const targets: LiveSkillEffectTargetData[] =
    transformLiveSkillEffectTargets(database)
  const targetSource = new Map(
    targets.map((target) => [target.id, target.description]),
  )
  const attributeIds = new Map<number, string>()
  const allDescriptions: LocalizedText[] = []
  for (const target of targets) {
    allDescriptions.push(target.description)
    if (target.cardAttributeType !== null) {
      const marker = target.description[gameLocales[0]!].match(
        /\[attribute=([^\]]+)\]/,
      )?.[1]
      if (marker) attributeIds.set(target.cardAttributeType, marker)
    }
  }

  const effectTextQuery = makeTextQuery(
    database,
    langGeneratedLivePassiveSkillEffect,
  )
  const effectRows = database
    .select({
      groupId: livePassiveSkillEffect.groupId,
      number: livePassiveSkillEffect.number,
      type: livePassiveSkillEffect.type,
      value: livePassiveSkillEffect.value,
      liveSkillEffectTargetId: livePassiveSkillEffect.liveSkillEffectTargetId,
      resourceType: livePassiveSkillEffect.resourceType,
      resourceIds: livePassiveSkillEffect.resourceIds,
      descriptionLangId: livePassiveSkillEffect.descriptionLangId,
    })
    .from(livePassiveSkillEffect)
    .orderBy(
      asc(livePassiveSkillEffect.groupId),
      asc(livePassiveSkillEffect.number),
    )
    .all()
  const effectSources = new Map<string, LocalizedText>()
  for (const row of effectRows) {
    const text = sourceText(
      effectTextQuery.all({ id: row.descriptionLangId }),
      row.descriptionLangId,
      'LangGeneratedLivePassiveSkillEffect',
      'LivePassiveSkillEffect',
      'description_lang_id',
      `${row.groupId}:${row.number}`,
    )
    effectSources.set(`${row.groupId}:${row.number}`, text)
    allDescriptions.push(text)
  }

  const triggerTextQuery = makeTextQuery(
    database,
    langGeneratedLiveSkillTrigger,
  )
  const triggerRows = database
    .select({
      groupId: liveSkillTrigger.groupId,
      number: liveSkillTrigger.number,
      type: liveSkillTrigger.type,
      threshold: liveSkillTrigger.threshold,
      characterIds: liveSkillTrigger.characterIds,
      characterGroupingId: liveSkillTrigger.characterGroupingId,
      musicId: liveSkillTrigger.musicId,
      cardAttributeType: liveSkillTrigger.cardAttributeType,
      liveNoteJudgementType: liveSkillTrigger.liveNoteJudgementType,
      descriptionLangId: liveSkillTrigger.descriptionLangId,
    })
    .from(liveSkillTrigger)
    .orderBy(asc(liveSkillTrigger.groupId), asc(liveSkillTrigger.number))
    .all()
  const judgementSources = new Map<number, LocalizedText>()
  const triggerSources = new Map<string, LocalizedText>()
  for (const row of triggerRows) {
    const text = sourceText(
      triggerTextQuery.all({ id: row.descriptionLangId }),
      row.descriptionLangId,
      'LangGeneratedLiveSkillTrigger',
      'LiveSkillTrigger',
      'description_lang_id',
      `${row.groupId}:${row.number}`,
    )
    triggerSources.set(`${row.groupId}:${row.number}`, text)
    allDescriptions.push(text)
    if (row.cardAttributeType !== null) {
      const marker = text.jpn.match(/\[attribute=([^\]]+)\]/)?.[1]
      if (marker) attributeIds.set(row.cardAttributeType, marker)
    }
    if (
      row.liveNoteJudgementType !== null &&
      !judgementSources.has(row.liveNoteJudgementType)
    ) {
      judgementSources.set(row.liveNoteJudgementType, text)
    }
  }
  addAttributeLabels(allDescriptions, catalog.labels)
  createJudgementLabels(judgementSources, catalog.labels)

  const effects = sortGroups(
    effectRows.map((row): LivePassiveSkillEffectData => {
      const key = `${row.groupId}:${row.number}`
      const text = effectSources.get(key)!
      const candidates: DescriptionCandidate[] = []
      if (row.liveSkillEffectTargetId !== null) {
        const targetText = targetSource.get(row.liveSkillEffectTargetId)
        if (!targetText)
          throw new Error(
            `Missing LiveSkillEffectTarget ${row.liveSkillEffectTargetId} referenced by LivePassiveSkillEffect.live_skill_effect_target_id in row ${key}`,
          )
        candidates.push({
          name: 'target',
          value: { kind: 'target', id: row.liveSkillEffectTargetId },
          text: targetText,
        })
      }
      if (row.value !== null && [4, 5, 6, 8, 10].includes(row.type)) {
        candidates.push({
          name: 'percent',
          value: Number(row.value) / 10,
          text: Object.fromEntries(
            gameLocales.map((locale) => [
              locale,
              String(Number(row.value) / 10),
            ]),
          ) as LocalizedText,
        })
      }
      const description = [4, 5, 6, 8, 10].includes(row.type)
        ? inferSkillDescription(
            {
              domain: 'effect',
              type: row.type,
              table: 'LivePassiveSkillEffect',
              key,
              text,
              candidates,
            },
            catalog,
            pendingDescriptions,
            confirmedTemplates,
          )
        : null
      if (![4, 5, 6, 8, 10].includes(row.type))
        reportPendingDescription(pendingDescriptions, {
          table: 'LivePassiveSkillEffect',
          key,
          type: row.type,
          language: null,
          reason: 'Unknown effect type',
        })
      return {
        groupId: row.groupId,
        number: row.number,
        type: row.type,
        value: row.value,
        liveSkillEffectTargetId: row.liveSkillEffectTargetId,
        resourceType: row.resourceType,
        resourceIds:
          row.resourceIds === null
            ? null
            : parseJsonArray(row.resourceIds, {
                table: 'LivePassiveSkillEffect',
                field: 'resource_ids',
                rowId: key,
              }),
        description,
      }
    }),
  )

  const triggers = sortGroups(
    triggerRows.map((row): LiveSkillTriggerData => {
      const key = `${row.groupId}:${row.number}`
      const text = triggerSources.get(key)!
      const candidates: DescriptionCandidate[] = []
      const characterIds =
        row.characterIds === null
          ? null
          : parseJsonArray<string>(row.characterIds, {
              table: 'LiveSkillTrigger',
              field: 'character_ids',
              rowId: key,
            })
      for (const id of characterIds ?? [])
        candidates.push(
          refCandidate(
            'character',
            'character',
            id,
            catalog.labels,
            'LiveSkillTrigger',
            'character_ids',
            key,
          ),
        )
      if (row.characterGroupingId !== null)
        candidates.push(
          refCandidate(
            'group',
            'group',
            row.characterGroupingId,
            catalog.labels,
            'LiveSkillTrigger',
            'character_grouping_id',
            key,
          ),
        )
      const attribute = attributeCandidate(
        row.cardAttributeType,
        catalog.labels,
        attributeIds,
      )
      let unresolved =
        row.cardAttributeType !== null && !attribute
          ? 'Cannot identify complete attribute labels'
          : null
      if (attribute) candidates.push(attribute)
      if (row.liveNoteJudgementType !== null) {
        const id = String(row.liveNoteJudgementType)
        const label = catalog.labels.judgement[id]
        if (!label) unresolved = `Cannot identify judgement label ${id}`
        else
          candidates.push({
            name: 'judgement',
            value: { kind: 'judgement', id },
            text: label,
          })
      }
      if (row.threshold !== null) {
        candidates.push({
          name: 'threshold',
          value: Number(row.threshold),
          text: Object.fromEntries(
            gameLocales.map((locale) => [
              locale,
              String(Number(row.threshold)),
            ]),
          ) as LocalizedText,
        })
      }
      const known = [1, 2, 4, 7, 8, 9, 10, 11, 12].includes(row.type)
      const description =
        known && unresolved === null
          ? inferSkillDescription(
              {
                domain: 'trigger',
                type: row.type,
                table: 'LiveSkillTrigger',
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
          table: 'LiveSkillTrigger',
          key,
          type: row.type,
          language: null,
          reason: 'Unknown trigger type',
        })
      else if (unresolved !== null)
        reportPendingDescription(pendingDescriptions, {
          table: 'LiveSkillTrigger',
          key,
          type: row.type,
          language: null,
          reason: unresolved,
        })
      return {
        groupId: row.groupId,
        number: row.number,
        type: row.type,
        threshold: row.threshold,
        characterIds,
        characterGroupingId: row.characterGroupingId,
        musicId: row.musicId,
        cardAttributeType: row.cardAttributeType,
        liveNoteJudgementType: row.liveNoteJudgementType,
        description,
      }
    }),
  )

  const liveTargets: LiveSkillTargetData[] = targets.map((target) => {
    const key = target.id
    const text = target.description
    const candidates: DescriptionCandidate[] = []
    if (target.type === 4 && target.characterGroupingId !== null) {
      candidates.push(
        refCandidate(
          'group',
          'group',
          target.characterGroupingId,
          catalog.labels,
          'LiveSkillEffectTarget',
          'character_grouping_id',
          key,
        ),
      )
    }
    if (target.type === 3 && target.characterId !== null) {
      candidates.push(
        refCandidate(
          'character',
          'character',
          target.characterId,
          catalog.labels,
          'LiveSkillEffectTarget',
          'character_id',
          key,
        ),
      )
    }
    const attribute = attributeCandidate(
      target.cardAttributeType,
      catalog.labels,
      attributeIds,
    )
    if (attribute) candidates.push(attribute)
    if (target.targetCount !== null)
      candidates.push({
        name: 'count',
        value: target.targetCount,
        text: Object.fromEntries(
          gameLocales.map((locale) => [locale, String(target.targetCount)]),
        ) as LocalizedText,
      })
    let description = null
    if (target.type === 4 && target.targetCount === null) {
      reportPendingDescription(pendingDescriptions, {
        table: 'LiveSkillEffectTarget',
        key,
        type: target.type,
        language: null,
        reason: 'target_count is null for a character grouping target',
      })
    } else if (target.cardAttributeType !== null && !attribute) {
      reportPendingDescription(pendingDescriptions, {
        table: 'LiveSkillEffectTarget',
        key,
        type: target.type,
        language: null,
        reason: 'Cannot identify complete attribute labels',
      })
    } else if ([1, 2, 3, 4, 5].includes(target.type)) {
      description = inferSkillDescription(
        {
          domain: 'target',
          type: target.type,
          table: 'LiveSkillEffectTarget',
          key,
          text,
          candidates,
        },
        catalog,
        pendingDescriptions,
        confirmedTemplates,
      )
    } else {
      reportPendingDescription(pendingDescriptions, {
        table: 'LiveSkillEffectTarget',
        key,
        type: target.type,
        language: null,
        reason: 'Unknown target type',
      })
    }
    return { ...target, description }
  })

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
    targets: liveTargets,
    catalog,
    pendingDescriptions,
  }
}

export function transformCostumes(database: GameDatabase): CostumeData[] {
  const rows = database
    .select({
      id: costume.id,
      characterId: costume.characterId,
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
