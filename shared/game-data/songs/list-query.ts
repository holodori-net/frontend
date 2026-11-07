import type { LocationQuery } from 'vue-router'
import {
  createSongListConditions,
  type SongListSort,
  type SongListConditions,
  type SongFilterOptions,
  type SongUnlockType,
  type SongVideoKind,
} from './list.ts'

const sortKeys: readonly SongListSort[] = [
  'order',
  'title',
  'startTime',
  'playingSeconds',
  'levelEasy',
  'levelNormal',
  'levelHard',
  'levelExpert',
  'notes',
]
const queryKeys = new Set([
  'q',
  'character',
  'category',
  'singerType',
  'difficulty',
  'levelMin',
  'levelMax',
  'notesDifficulty',
  'notesMin',
  'notesMax',
  'durationMin',
  'durationMax',
  'streamingMute',
  'video',
  'unlock',
  'sort',
  'direction',
])
const ALL_VIDEO_TYPES: SongVideoKind[] = ['mv', 'live', 'none']

function queryValues(value: LocationQuery[string] | undefined): string[] {
  return (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === 'string',
  )
}

function uniqueValid<T extends string | number | boolean>(
  values: string[],
  allowed: readonly T[],
  parse: (value: string) => T | null,
): T[] {
  const allowedSet = new Set(allowed)
  const result = new Set<T>()
  for (const value of values) {
    const parsed = parse(value)
    if (parsed !== null && allowedSet.has(parsed)) result.add(parsed)
  }
  return [...result]
}

function integer(value: string): number | null {
  if (!/^-?\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function checkboxSelection<T extends string | number | boolean>(
  value: LocationQuery[string] | undefined,
  allowed: readonly T[],
  parse: (value: string) => T | null,
): T[] {
  if (value === undefined) return [...allowed]
  const values = queryValues(value)
  if (values.includes('')) return []
  return uniqueValid(values, allowed, parse)
}

function parseRangeValue(
  value: LocationQuery[string] | undefined,
): number | null {
  const raw = queryValues(value)[0]
  if (raw === undefined || raw === '') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function normalizeRange(
  min: number | null,
  max: number | null,
): [number | null, number | null] {
  return min !== null && max !== null && min > max ? [max, min] : [min, max]
}

function booleanValue(value: string): boolean | null {
  return value === 'true' ? true : value === 'false' ? false : null
}

export function parseSongListQuery(
  query: LocationQuery,
  options: SongFilterOptions,
): SongListConditions {
  const conditions = createSongListConditions(options)
  const q = queryValues(query.q)[0]
  if (q !== undefined) conditions.q = q.trim()
  conditions.character = uniqueValid(
    queryValues(query.character),
    options.character,
    (value) => value,
  )
  conditions.category = checkboxSelection(
    query.category,
    options.category,
    integer,
  )
  conditions.singerType = checkboxSelection(
    query.singerType,
    options.singerType,
    integer,
  )
  conditions.difficulty = checkboxSelection(
    query.difficulty,
    options.difficulty,
    integer,
  )
  conditions.notesDifficulty = checkboxSelection(
    query.notesDifficulty,
    [1, 2, 3, 4],
    integer,
  )
  ;[conditions.levelMin, conditions.levelMax] = normalizeRange(
    parseRangeValue(query.levelMin),
    parseRangeValue(query.levelMax),
  )
  ;[conditions.notesMin, conditions.notesMax] = normalizeRange(
    parseRangeValue(query.notesMin),
    parseRangeValue(query.notesMax),
  )
  ;[conditions.durationMin, conditions.durationMax] = normalizeRange(
    parseRangeValue(query.durationMin),
    parseRangeValue(query.durationMax),
  )
  conditions.streamingMute = checkboxSelection(
    query.streamingMute,
    [true, false],
    booleanValue,
  )
  conditions.video = checkboxSelection(query.video, options.video, (value) =>
    (ALL_VIDEO_TYPES as readonly string[]).includes(value)
      ? (value as SongVideoKind)
      : null,
  )
  conditions.unlock = checkboxSelection(
    query.unlock,
    options.unlock,
    (value) =>
      (options.unlock as readonly string[]).includes(value)
        ? (value as SongUnlockType)
        : null,
  )
  const sort = queryValues(query.sort)[0]
  if (sort === 'level') conditions.sort = 'levelExpert'
  else if (sort && sortKeys.includes(sort as SongListSort))
    conditions.sort = sort as SongListSort
  const direction = queryValues(query.direction)[0]
  if (direction === 'asc' || direction === 'desc')
    conditions.direction = direction
  return conditions
}

function sameSelection<T>(selection: readonly T[], options: readonly T[]) {
  const selected = new Set(selection)
  const available = new Set(options)
  return (
    selected.size === available.size &&
    [...available].every((item) => selected.has(item))
  )
}

export function toSongListQuery(
  conditions: SongListConditions,
  options: SongFilterOptions,
  existingQuery: LocationQuery = {},
): LocationQuery {
  const query: LocationQuery = Object.fromEntries(
    Object.entries(existingQuery).filter(([key]) => !queryKeys.has(key)),
  )
  const q = conditions.q.trim()
  if (q) query.q = q
  if (conditions.character.length)
    query.character = [...new Set(conditions.character)]
  for (const key of ['category', 'singerType', 'difficulty'] as const) {
    const selected = conditions[key]
    if (!sameSelection(selected, options[key]))
      query[key] = selected.length ? [...new Set(selected)].map(String) : ''
  }
  if (!sameSelection(conditions.notesDifficulty, [1, 2, 3, 4])) {
    query.notesDifficulty = conditions.notesDifficulty.length
      ? [...new Set(conditions.notesDifficulty)].map(String)
      : ''
  }
  if (!sameSelection(conditions.unlock, options.unlock)) {
    query.unlock = conditions.unlock.length
      ? [...new Set(conditions.unlock)]
      : ''
  }
  const [levelMin, levelMax] = normalizeRange(
    conditions.levelMin,
    conditions.levelMax,
  )
  if (levelMin !== null) query.levelMin = String(levelMin)
  if (levelMax !== null) query.levelMax = String(levelMax)
  const [notesMin, notesMax] = normalizeRange(
    conditions.notesMin,
    conditions.notesMax,
  )
  if (notesMin !== null) query.notesMin = String(notesMin)
  if (notesMax !== null) query.notesMax = String(notesMax)
  const [durationMin, durationMax] = normalizeRange(
    conditions.durationMin,
    conditions.durationMax,
  )
  if (durationMin !== null) query.durationMin = String(durationMin)
  if (durationMax !== null) query.durationMax = String(durationMax)
  if (!sameSelection(conditions.streamingMute, [true, false])) {
    query.streamingMute = conditions.streamingMute.length
      ? [...new Set(conditions.streamingMute)].map(String)
      : ''
  }
  if (!sameSelection(conditions.video, options.video)) {
    query.video = conditions.video.length ? [...new Set(conditions.video)] : ''
  }
  if (conditions.sort !== 'startTime') query.sort = conditions.sort
  if (conditions.direction !== 'desc') query.direction = conditions.direction
  return query
}
