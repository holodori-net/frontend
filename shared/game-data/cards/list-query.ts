import type { LocationQuery } from 'vue-router'
import type { CardStatKey } from './list-data.ts'
import {
  createCardListConditions,
  type CardFilterOptions,
  type CardListConditions,
  type CardListSort,
} from './list.ts'

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
  'skill',
  'connect',
  'rarity',
  'attribute',
  'specialization',
  // Remove layout from legacy URLs when the conditions are next serialized.
  'layout',
  'sort',
  'direction',
])

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
  conditions.skill = uniqueValid(
    queryValues(query.skill),
    options.skill ?? [],
    (value) => value,
  )
  conditions.connect = uniqueValid(
    queryValues(query.connect),
    options.connect ?? [],
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
  if (conditions.skill.length)
    query.skill = [...new Set(conditions.skill)].sort()
  if (conditions.connect.length)
    query.connect = [...new Set(conditions.connect)].sort()
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
