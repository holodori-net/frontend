import type {
  CardListCostumeData,
  CardListSkillData,
} from '#shared/game-data/card-list-data'
import type { CardSkillData } from '#shared/game-data/card-skills'
import type {
  CostumeData,
  DescriptionEntity,
  DescriptionCatalog,
  LiveSkillData,
  SkillDescription,
} from '#shared/game-data/live-skills'

const entities: readonly Exclude<DescriptionEntity, 'target'>[] = [
  'character',
  'group',
  'attribute',
  'judgement',
]

function addDescription(
  description: SkillDescription | null,
  source: string,
  catalog: DescriptionCatalog,
  templates: Set<string>,
  targets: Set<string>,
  labels: Record<string, Set<string>>,
) {
  if (!description) return
  const template = catalog.templates[description.templateId]
  if (!template) {
    throw new Error(
      `${source} references missing description template ${description.templateId}`,
    )
  }
  templates.add(description.templateId)
  for (const name of template.parameters) {
    const value = description.params[name]
    if (value === undefined || value === null) {
      throw new Error(
        `${source} description ${description.templateId} is missing parameter ${name}`,
      )
    }
    if (!value || typeof value !== 'object') continue
    if (value.kind === 'target') targets.add(value.id)
    else if (entities.includes(value.kind)) {
      if (!catalog.labels[value.kind]?.[value.id]) {
        throw new Error(
          `${source} references missing ${value.kind} label ${value.id}`,
        )
      }
      labels[value.kind]!.add(value.id)
    }
  }
}

type CardReferences = readonly {
  id: string
  livePassiveSkillId: string
  liveActiveSkillId: string
  liveSpecialSkillId: string
}[]

export function projectCardListSkills(
  data: LiveSkillData,
  cardSkills: CardSkillData,
  cards: CardReferences,
  costumeIds: ReadonlySet<string>,
): {
  costumes: Record<string, CardListCostumeData>
  skills: CardListSkillData
} {
  const costumesById = new Map(
    data.costumes.map((costume) => [costume.id, costume]),
  )
  const leadersById = new Map(
    data.leaderSkills.map((skill) => [skill.id, skill]),
  )
  const costumes: Record<string, CardListCostumeData> = {}
  const leaderIds = new Set<string>()

  for (const id of costumeIds) {
    const costume = costumesById.get(id)
    if (!costume)
      throw new Error(`Missing Costume ${id} referenced by Card or Character`)
    costumes[id] = {
      name: costume.name,
      leaderSkillId: costume.liveLeaderSkillId,
    }
    if (costume.liveLeaderSkillId !== null) {
      if (!leadersById.has(costume.liveLeaderSkillId)) {
        throw new Error(
          `Missing LiveLeaderSkill ${costume.liveLeaderSkillId} referenced by Costume.live_leader_skill_id in row ${id}`,
        )
      }
      leaderIds.add(costume.liveLeaderSkillId)
    }
  }

  const passiveIds = new Set(
    cards.map(({ livePassiveSkillId }) => livePassiveSkillId),
  )
  const activeIds = new Set(
    cards.map(({ liveActiveSkillId }) => liveActiveSkillId),
  )
  const specialIds = new Set(
    cards.map(({ liveSpecialSkillId }) => liveSpecialSkillId),
  )
  const passiveSkills = selectLevels(
    passiveIds,
    cardSkills.passiveSkills,
    cards,
    'LivePassiveSkill',
  )
  const activeSkills = selectLevels(
    activeIds,
    cardSkills.activeSkills,
    cards,
    'LiveActiveSkill',
  )
  const specialSkills = selectLevels(
    specialIds,
    cardSkills.specialSkills,
    cards,
    'LiveSpecialSkill',
  )

  const effects = new Set<string>()
  const activeEffects = new Set<string>()
  const triggers = new Set<string>()
  for (const id of leaderIds) {
    const skill = leadersById.get(id)!
    effects.add(skill.livePassiveSkillEffectGroupId)
    if (skill.liveSkillTriggerGroupId)
      triggers.add(skill.liveSkillTriggerGroupId)
    if (skill.additionalLivePassiveSkillEffectGroupId)
      effects.add(skill.additionalLivePassiveSkillEffectGroupId)
    if (skill.additionalLiveSkillTriggerGroupId)
      triggers.add(skill.additionalLiveSkillTriggerGroupId)
  }
  for (const rows of Object.values(passiveSkills))
    for (const row of rows) {
      effects.add(row.livePassiveSkillEffectGroupId)
      if (row.additionalLivePassiveSkillEffectGroupId)
        effects.add(row.additionalLivePassiveSkillEffectGroupId)
      if (row.liveSkillTriggerGroupId) triggers.add(row.liveSkillTriggerGroupId)
      if (row.additionalLiveSkillTriggerGroupId)
        triggers.add(row.additionalLiveSkillTriggerGroupId)
    }
  for (const rows of Object.values(activeSkills))
    for (const row of rows) {
      activeEffects.add(row.liveActiveSkillEffectGroupId)
      if (row.additionalLiveActiveSkillEffectGroupId)
        activeEffects.add(row.additionalLiveActiveSkillEffectGroupId)
      if (row.liveSkillTriggerGroupId) triggers.add(row.liveSkillTriggerGroupId)
      if (row.additionalLiveSkillTriggerGroupId)
        triggers.add(row.additionalLiveSkillTriggerGroupId)
    }
  for (const rows of Object.values(specialSkills))
    for (const row of rows) {
      activeEffects.add(row.liveActiveSkillEffectGroupId)
      if (row.additionalLiveActiveSkillEffectGroupId)
        activeEffects.add(row.additionalLiveActiveSkillEffectGroupId)
      if (row.additionalLiveSkillTriggerGroupId)
        triggers.add(row.additionalLiveSkillTriggerGroupId)
    }

  const effectGroups = projectGroups(
    effects,
    cardSkills.effects,
    'LivePassiveSkillEffect',
  )
  const activeEffectGroups = projectGroups(
    activeEffects,
    cardSkills.activeEffects,
    'LiveActiveSkillEffect',
  )
  const triggerGroups = projectGroups(
    triggers,
    cardSkills.triggers,
    'LiveSkillTrigger',
  )
  const templates = new Set<string>()
  const targetIds = new Set<string>()
  const labelIds: Record<string, Set<string>> = Object.fromEntries(
    entities.map((kind) => [kind, new Set<string>()]),
  )
  for (const [groupId, rows] of Object.entries(cardSkills.effects)) {
    if (!effects.has(groupId)) continue
    rows.forEach((row) =>
      addDescription(
        row.description,
        `LivePassiveSkillEffect ${groupId}:${row.number}`,
        cardSkills.catalog,
        templates,
        targetIds,
        labelIds,
      ),
    )
  }
  for (const [groupId, rows] of Object.entries(cardSkills.activeEffects)) {
    if (!activeEffects.has(groupId)) continue
    rows.forEach((row) =>
      addDescription(
        row.description,
        `LiveActiveSkillEffect ${groupId}:${row.number}`,
        cardSkills.catalog,
        templates,
        targetIds,
        labelIds,
      ),
    )
  }
  for (const [groupId, rows] of Object.entries(cardSkills.triggers)) {
    if (!triggers.has(groupId)) continue
    rows.forEach((row) =>
      addDescription(
        row.description,
        `LiveSkillTrigger ${groupId}:${row.number}`,
        cardSkills.catalog,
        templates,
        targetIds,
        labelIds,
      ),
    )
  }

  const targetsById = new Map(
    cardSkills.targets.map((target) => [target.id, target]),
  )
  const selectedTargets = new Map<string, (typeof cardSkills.targets)[number]>()
  while (targetIds.size) {
    const [id] = targetIds
    targetIds.delete(id!)
    if (selectedTargets.has(id!)) continue
    const target = targetsById.get(id!)
    if (!target)
      throw new Error(
        `Missing LiveSkillEffectTarget ${id} referenced by card skill description`,
      )
    selectedTargets.set(id!, target)
    addDescription(
      target.description,
      `LiveSkillEffectTarget ${id}`,
      cardSkills.catalog,
      templates,
      targetIds,
      labelIds,
    )
  }

  const templateProjection = Object.fromEntries(
    [...templates].map((id) => {
      const template = cardSkills.catalog.templates[id]
      if (!template)
        throw new Error(`Missing description template ${id} in skill catalog`)
      return [id, { parameters: template.parameters, text: template.text }]
    }),
  )
  const labelProjection = Object.fromEntries(
    entities.map((kind) => [
      kind,
      Object.fromEntries(
        [...labelIds[kind]!].map((id) => {
          const label = cardSkills.catalog.labels[kind]?.[id]
          if (!label)
            throw new Error(`Missing ${kind} label ${id} in skill catalog`)
          return [id, label]
        }),
      ),
    ]),
  ) as CardListSkillData['catalog']['labels']

  const probabilityIds = new Set(
    Object.values(activeSkills).flatMap((rows) =>
      rows
        .map(
          ({ activationProbabilityPermilMultiply }) =>
            activationProbabilityPermilMultiply,
        )
        .filter((value): value is number => value !== null)
        .map(String),
    ),
  )
  const probability = cardSkills.catalog.labels.probability ?? {}
  const skillProjection: CardListSkillData = {
    leaderSkills: Object.fromEntries(
      [...leaderIds].map((id) => [id, leadersById.get(id)!]),
    ),
    passiveSkills,
    activeSkills,
    specialSkills,
    effects: effectGroups,
    activeEffects: activeEffectGroups,
    triggers: triggerGroups,
    targets: [...selectedTargets.values()].map(({ id, description }) => ({
      id,
      description,
    })),
    catalog: {
      templates: templateProjection,
      labels: {
        ...labelProjection,
        probability: Object.fromEntries(
          [...probabilityIds].flatMap((id) =>
            probability[id] ? [[id, probability[id]]] : [],
          ),
        ),
      },
    },
  }
  return { costumes, skills: skillProjection }
}

function selectLevels<T extends { level: number }>(
  ids: Set<string>,
  source: Record<string, T[]>,
  cards: CardReferences,
  kind: string,
): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const id of ids) {
    const rows = source[id]
    if (!rows?.length) {
      const card = cards.find((item) =>
        kind === 'LivePassiveSkill'
          ? item.livePassiveSkillId === id
          : kind === 'LiveActiveSkill'
            ? item.liveActiveSkillId === id
            : item.liveSpecialSkillId === id,
      )
      throw new Error(
        `Card ${card?.id ?? 'unknown'} references missing ${kind} ${id} or it has no levels`,
      )
    }
    result[id] = [...rows].sort((left, right) => left.level - right.level)
  }
  return result
}

function projectGroups<T extends { description: SkillDescription | null }>(
  ids: Set<string>,
  source: Record<string, T[]>,
  kind: string,
): Record<string, { description: SkillDescription | null }[]> {
  return Object.fromEntries(
    [...ids].map((id) => {
      const rows = source[id]
      if (!rows?.length)
        throw new Error(
          `Missing ${kind} group ${id} referenced by a card skill`,
        )
      return [id, rows.map(({ description }) => ({ description }))]
    }),
  )
}

export function costumeIdsForCards(
  cards: readonly {
    id: string
    characterId: string
    rewardCostumeId: string | null
  }[],
  characters: readonly { id: string; defaultCostumeId: string }[],
  costumes: readonly CostumeData[],
): Map<string, string> {
  const charactersById = new Map(
    characters.map((character) => [character.id, character]),
  )
  const costumesById = new Map(costumes.map((costume) => [costume.id, costume]))
  const result = new Map<string, string>()
  for (const card of cards) {
    const character = charactersById.get(card.characterId)
    if (!character) continue
    const costumeId = card.rewardCostumeId ?? character.defaultCostumeId
    const costume = costumesById.get(costumeId)
    if (!costume)
      throw new Error(`Card ${card.id} references missing Costume ${costumeId}`)
    if (costume.characterId !== card.characterId) {
      throw new Error(
        `Card ${card.id} references Costume ${costumeId} for Character ${costume.characterId}, expected ${card.characterId}`,
      )
    }
    result.set(card.id, costumeId)
  }
  return result
}
