import type { LocationQuery } from 'vue-router'
import type { CardListItemData, CardStatKey } from './card-list-data.ts'

export type CardListSort =
  | 'order'
  | 'rarity'
  | 'character'
  | 'performance'
  | 'technique'
  | 'sense'
  | 'total'

export type CardListLayout = 'full' | 'vertical'

export interface CardListConditions {
  q: string
  character: string[]
  rarity: number[]
  attribute: number[]
  specialization: CardStatKey[]
  sort: CardListSort
  direction: 'asc' | 'desc'
}

export interface CardFilterOptions {
  character: string[]
  rarity: number[]
  attribute: number[]
  specialization: CardStatKey[]
}

const statKeys: CardStatKey[] = ['performance', 'technique', 'sense']
const sortKeys: CardListSort[] = [
  'order',
  'rarity',
  'character',
  ...statKeys,
  'total',
]
const queryKeys = new Set<string>([
  'q',
  'character',
  'rarity',
  'attribute',
  'specialization',
  // Remove layout from legacy URLs when the conditions are next serialized.
  'layout',
  'sort',
  'direction',
])

export function createCardListConditions(
  options: CardFilterOptions,
): CardListConditions {
  return {
    q: '',
    character: [],
    rarity: [...options.rarity],
    attribute: [...options.attribute],
    specialization: [...options.specialization],
    sort: 'order',
    direction: 'desc',
  }
}

export function getCardFilterOptions(
  cards: readonly CardListItemData[],
): CardFilterOptions {
  const characterOrders = new Map<string, number>()
  for (const card of cards) {
    if (!characterOrders.has(card.characterId)) {
      characterOrders.set(card.characterId, card.characterOrder)
    }
  }

  return {
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

function queryValues(value: LocationQuery[string] | undefined): string[] {
  const values = Array.isArray(value) ? value : [value]
  return values.filter((item): item is string => typeof item === 'string')
}

function uniqueValid<T extends string | number>(
  values: string[],
  allowed: readonly T[],
  parse: (value: string) => T | null,
): T[] {
  const valid = new Set(allowed)
  const result = new Set<T>()
  for (const value of values) {
    const parsed = parse(value)
    if (parsed !== null && valid.has(parsed)) result.add(parsed)
  }
  return [...result]
}

function parseCheckboxSelection<T extends string | number>(
  value: LocationQuery[string] | undefined,
  allowed: readonly T[],
  parse: (value: string) => T | null,
): T[] {
  if (value === undefined) return [...allowed]

  const values = queryValues(value)
  if (values.includes('')) return []

  const selected = uniqueValid(values, allowed, parse)
  return selected.length ? selected : [...allowed]
}

function parseInteger(value: string): number | null {
  if (!/^-?\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

export function parseCardListQuery(
  query: LocationQuery,
  options: CardFilterOptions,
): CardListConditions {
  const conditions = createCardListConditions(options)
  const q = queryValues(query.q)[0]
  if (q !== undefined) conditions.q = q.trim()

  conditions.character = uniqueValid(
    queryValues(query.character),
    options.character,
    (value) => value,
  )
  conditions.rarity = parseCheckboxSelection(
    query.rarity,
    options.rarity,
    parseInteger,
  )
  conditions.attribute = parseCheckboxSelection(
    query.attribute,
    options.attribute,
    parseInteger,
  )
  conditions.specialization = parseCheckboxSelection(
    query.specialization,
    options.specialization,
    (value) =>
      statKeys.includes(value as CardStatKey) ? (value as CardStatKey) : null,
  )

  const sort = queryValues(query.sort)[0]
  if (sort && sortKeys.includes(sort as CardListSort)) {
    conditions.sort = sort as CardListSort
  }
  const direction = queryValues(query.direction)[0]
  if (direction === 'asc' || direction === 'desc') {
    conditions.direction = direction
  }
  return conditions
}

export function toCardListQuery(
  conditions: CardListConditions,
  options: CardFilterOptions,
  existingQuery: LocationQuery = {},
): LocationQuery {
  const query: LocationQuery = Object.fromEntries(
    Object.entries(existingQuery).filter(([key]) => !queryKeys.has(key)),
  )

  const q = conditions.q.trim()
  if (q) query.q = q
  if (conditions.character.length)
    query.character = [...new Set(conditions.character)]
  if (!sameSelection(conditions.rarity, options.rarity)) {
    query.rarity = conditions.rarity.length
      ? [...new Set(conditions.rarity)].map(String)
      : ''
  }
  if (!sameSelection(conditions.attribute, options.attribute)) {
    query.attribute = conditions.attribute.length
      ? [...new Set(conditions.attribute)].map(String)
      : ''
  }
  if (!sameSelection(conditions.specialization, options.specialization)) {
    query.specialization = conditions.specialization.length
      ? [...new Set(conditions.specialization)]
      : ''
  }
  if (conditions.sort !== 'order') query.sort = conditions.sort
  if (conditions.direction !== 'desc') query.direction = conditions.direction
  return query
}

function sameSelection<T>(selection: readonly T[], options: readonly T[]) {
  const selectedSet = new Set(selection)
  const optionSet = new Set(options)
  return (
    selectedSet.size === optionSet.size &&
    [...optionSet].every((option) => selectedSet.has(option))
  )
}

function searchText(card: CardListItemData) {
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
): CardListItemData[] {
  const needle = conditions.q.trim().toLowerCase()
  const direction = conditions.direction === 'asc' ? 1 : -1

  return cards
    .filter((card) => {
      if (needle && !searchText(card).includes(needle)) return false
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

export function getCardImageUrl(
  assetId: string | null,
  layout: CardListLayout = 'full',
): string | null {
  if (!assetId) return null
  const name = `img_card_${layout === 'vertical' ? 'vert' : 'full'}_${assetId}`
  return `https://assets.holodori.net/cdn/${name}/Texture2D/${name}.webp`
}
