export type CardListLayout = 'full' | 'vertical'

export const CARD_LIST_FIELDS = [
  'name',
  'characterName',
  'parameters',
  'passiveSkill',
  'activeSkill',
  'specialSkill',
  'costume',
  'connectEffect',
] as const
export type CardListField = (typeof CARD_LIST_FIELDS)[number]

export const CARD_BASIC_INFORMATION_FIELDS = [
  'name',
  'characterName',
  'parameters',
] as const satisfies readonly CardListField[]

export interface CardListFieldGroup {
  key:
    | 'basic'
    | Exclude<CardListField, (typeof CARD_BASIC_INFORMATION_FIELDS)[number]>
  fields: CardListField[]
}

export function getCardListFieldGroups(
  fields: readonly CardListField[],
): CardListFieldGroup[] {
  const groups = new Map<CardListFieldGroup['key'], CardListFieldGroup>()
  for (const field of fields) {
    const key: CardListFieldGroup['key'] = (
      CARD_BASIC_INFORMATION_FIELDS as readonly string[]
    ).includes(field)
      ? 'basic'
      : (field as Exclude<
          CardListField,
          (typeof CARD_BASIC_INFORMATION_FIELDS)[number]
        >)
    const group = groups.get(key) ?? { key, fields: [] }
    group.fields.push(field)
    groups.set(key, group)
  }
  return [...groups.values()]
}

export const CARD_SKILL_FIELDS = [
  'passiveSkill',
  'activeSkill',
  'specialSkill',
  'connectEffect',
] as const satisfies readonly CardListField[]
export type CardSkillField = (typeof CARD_SKILL_FIELDS)[number]
export type CardSkillLevelSelections = Record<CardSkillField, number[]>

export interface CardSkillLevelGroups {
  passiveSkills: Record<string, readonly { level: number }[]>
  activeSkills: Record<string, readonly { level: number }[]>
  specialSkills: Record<string, readonly { level: number }[]>
}

export function getCardSkillAvailableLevels(
  skills: CardSkillLevelGroups,
  connectEffects: Record<string, readonly { level: number }[]> = {},
): CardSkillLevelSelections {
  const levels = (groups: Record<string, readonly { level: number }[]>) =>
    [
      ...new Set(
        Object.values(groups).flatMap((rows) => rows.map(({ level }) => level)),
      ),
    ].sort((left, right) => left - right)
  return {
    passiveSkill: levels(skills.passiveSkills),
    activeSkill: levels(skills.activeSkills),
    specialSkill: levels(skills.specialSkills),
    connectEffect: levels(connectEffects),
  }
}
