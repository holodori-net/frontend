import type { CardListItemData, CardStatKey } from './list-data.ts'

export type CardListSort =
  | 'order'
  | 'rarity'
  | 'character'
  | 'performance'
  | 'technique'
  | 'sense'
  | 'total'

export interface CardListConditions {
  q: string
  character: string[]
  skill: string[]
  connect: string[]
  rarity: number[]
  attribute: number[]
  specialization: CardStatKey[]
  sort: CardListSort
  direction: 'asc' | 'desc'
}

export interface CardFilterOptions {
  character: string[]
  skill?: string[]
  connect?: string[]
  rarity: number[]
  attribute: number[]
  specialization: CardStatKey[]
}

const statKeys: CardStatKey[] = ['performance', 'technique', 'sense']
export function createCardListConditions(
  options: CardFilterOptions,
): CardListConditions {
  return {
    q: '',
    character: [],
    skill: [],
    connect: [],
    rarity: [...options.rarity],
    attribute: [...options.attribute],
    specialization: [...options.specialization],
    sort: 'order',
    direction: 'desc',
  }
}

export function getCardFilterOptions(
  cards: readonly CardListItemData[],
  skillKeys?: readonly string[],
  connectKeys?: readonly string[],
): CardFilterOptions {
  const characterOrders = new Map<string, number>()
  for (const card of cards) {
    if (!characterOrders.has(card.characterId)) {
      characterOrders.set(card.characterId, card.characterOrder)
    }
  }

  return {
    ...(skillKeys ? { skill: [...new Set(skillKeys)].sort() } : {}),
    ...(connectKeys ? { connect: [...new Set(connectKeys)].sort() } : {}),
    character: [...characterOrders]
      .sort(
        ([aId, aOrder], [bId, bOrder]) =>
          aOrder - bOrder || compareText(aId, bId),
      )
      .map(([id]) => id),
    rarity: [...new Set(cards.map((card) => card.rarity))].sort(
      (a, b) => a - b,
    ),
    attribute: [...new Set(cards.map((card) => card.attributeType))].sort(
      (a, b) => a - b,
    ),
    specialization: statKeys.filter((key) =>
      cards.some((card) => card.specializations.includes(key)),
    ),
  }
}

function nameSearchText(card: CardListItemData) {
  return [...Object.values(card.name), ...Object.values(card.characterName)]
    .join('\n')
    .toLowerCase()
}

function compareText(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0
}

export function filterAndSortCards(
  cards: readonly CardListItemData[],
  conditions: CardListConditions,
  cardSkills: Readonly<Record<string, readonly string[]>> = {},
  canonicalKeys: Readonly<Record<string, string>> = {},
  cardExtents: Readonly<Record<string, readonly string[]>> = {},
  searchTextByCardId?: Readonly<Record<string, string>>,
): CardListItemData[] {
  const tokens = conditions.q.trim().toLowerCase().split(/\s+/u).filter(Boolean)
  const direction = conditions.direction === 'asc' ? 1 : -1
  const selectedSkills = new Set(
    conditions.skill.map((key) => canonicalKeys[key] ?? key),
  )
  const selectedConnectExtents = new Set(conditions.connect)

  return cards
    .filter((card) => {
      if (tokens.length) {
        const searchText = searchTextByCardId?.[card.id] ?? nameSearchText(card)
        if (!tokens.every((token) => searchText.includes(token))) return false
      }
      if (
        selectedSkills.size &&
        !cardSkills[card.id]?.some((key) => selectedSkills.has(key))
      ) {
        return false
      }
      if (
        selectedConnectExtents.size &&
        !cardExtents[card.id]?.some((extentId) =>
          selectedConnectExtents.has(extentId),
        )
      ) {
        return false
      }
      if (
        conditions.character.length &&
        !conditions.character.includes(card.characterId)
      ) {
        return false
      }
      if (!conditions.rarity.includes(card.rarity)) {
        return false
      }
      if (!conditions.attribute.includes(card.attributeType)) {
        return false
      }
      return card.specializations.some((value) =>
        conditions.specialization.includes(value),
      )
    })
    .sort((a, b) => {
      let comparison = 0
      switch (conditions.sort) {
        case 'character':
          comparison = a.characterOrder - b.characterOrder
          break
        case 'performance':
        case 'technique':
        case 'sense':
          comparison = a.stats[conditions.sort] - b.stats[conditions.sort]
          break
        case 'rarity':
          comparison = a.rarity - b.rarity
          break
        case 'total':
          comparison = a.total - b.total
          break
        case 'order':
          comparison = a.order - b.order
          break
      }
      if (comparison) return comparison * direction
      return b.order - a.order || compareText(a.id, b.id)
    })
}
