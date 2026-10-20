import type {
  CardListCostumeData,
  CardListSkillData,
} from '#shared/game-data/card-list-data'
import type {
  CostumeData,
  DescriptionEntity,
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
  data: LiveSkillData,
  templates: Set<string>,
  targets: Set<string>,
  labels: Record<string, Set<string>>,
) {
  if (!description) return
  const template = data.catalog.templates[description.templateId]
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
      if (!data.catalog.labels[value.kind]?.[value.id]) {
        throw new Error(
          `${source} references missing ${value.kind} label ${value.id}`,
        )
      }
      labels[value.kind]!.add(value.id)
    }
  }
}

export function projectCardListSkills(
  data: LiveSkillData,
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

  const effects = new Set<string>()
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

  const effectGroups = Object.fromEntries(
    [...effects].flatMap((id) => {
      const rows = data.effects[id]
      if (!rows?.length)
        throw new Error(
          `Missing LivePassiveSkillEffect group ${id} referenced by a card costume skill`,
        )
      return [[id, rows.map(({ description }) => ({ description }))]]
    }),
  )
  const triggerGroups = Object.fromEntries(
    [...triggers].flatMap((id) => {
      const rows = data.triggers[id]
      if (!rows?.length)
        throw new Error(
          `Missing LiveSkillTrigger group ${id} referenced by a card costume skill`,
        )
      return [[id, rows.map(({ description }) => ({ description }))]]
    }),
  )

  const templates = new Set<string>()
  const targetIds = new Set<string>()
  const labelIds: Record<string, Set<string>> = Object.fromEntries(
    entities.map((kind) => [kind, new Set<string>()]),
  )
  for (const groupId of effects) {
    data.effects[groupId]!.forEach((row) =>
      addDescription(
        row.description,
        `LivePassiveSkillEffect ${groupId}:${row.number}`,
        data,
        templates,
        targetIds,
        labelIds,
      ),
    )
  }
  for (const groupId of triggers) {
    data.triggers[groupId]!.forEach((row) =>
      addDescription(
        row.description,
        `LiveSkillTrigger ${groupId}:${row.number}`,
        data,
        templates,
        targetIds,
        labelIds,
      ),
    )
  }

  const targetsById = new Map(data.targets.map((target) => [target.id, target]))
  const selectedTargets = new Map<string, (typeof data.targets)[number]>()
  while (targetIds.size) {
    const [id] = targetIds
    targetIds.delete(id!)
    if (selectedTargets.has(id!)) continue
    const target = targetsById.get(id!)
    if (!target)
      throw new Error(
        `Missing LiveSkillEffectTarget ${id} referenced by card costume skill description`,
      )
    selectedTargets.set(id!, target)
    addDescription(
      target.description,
      `LiveSkillEffectTarget ${id}`,
      data,
      templates,
      targetIds,
      labelIds,
    )
  }

  const templateProjection = Object.fromEntries(
    [...templates].flatMap((id) => {
      const template = data.catalog.templates[id]
      if (!template)
        throw new Error(`Missing description template ${id} in skill catalog`)
      return [[id, { parameters: template.parameters, text: template.text }]]
    }),
  )
  const labelProjection = Object.fromEntries(
    entities.map((kind) => [
      kind,
      Object.fromEntries(
        [...labelIds[kind]!].flatMap((id) => {
          const label = data.catalog.labels[kind]?.[id]
          if (!label)
            throw new Error(`Missing ${kind} label ${id} in skill catalog`)
          return [[id, label]]
        }),
      ),
    ]),
  ) as CardListSkillData['catalog']['labels']

  const skillProjection: CardListSkillData = {
    leaderSkills: Object.fromEntries(
      [...leaderIds].map((id) => [id, leadersById.get(id)!]),
    ),
    effects: effectGroups,
    triggers: triggerGroups,
    targets: [...selectedTargets.values()].map(({ id, description }) => ({
      id,
      description,
    })),
    catalog: { templates: templateProjection, labels: labelProjection },
  }
  return { costumes, skills: skillProjection }
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
