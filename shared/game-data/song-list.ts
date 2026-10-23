import type { LocationQuery } from 'vue-router'
import type { GameLocale } from '../language.ts'
import type { SongListItemData } from './songs.ts'

export type SongListSort =
  'order' | 'title' | 'startTime' | 'playingSeconds' | 'level' | 'notes'

export const SONG_BASIC_FIELDS = [
  'title',
  'singer',
  'category',
  'duration',
] as const
export const SONG_LIST_FIELDS = [
  ...SONG_BASIC_FIELDS,
  'charts',
  'credits',
  'availability',
  'unlock',
  'scoring',
  'musicVideos',
  'copyright',
] as const
export type SongListField = (typeof SONG_LIST_FIELDS)[number]

export interface SongListFieldGroup {
  key: 'basic' | Exclude<SongListField, (typeof SONG_BASIC_FIELDS)[number]>
  fields: SongListField[]
}

export function getSongListFieldGroups(
  fields: readonly SongListField[],
): SongListFieldGroup[] {
  const groups = new Map<SongListFieldGroup['key'], SongListFieldGroup>()
  for (const field of fields) {
    const key: SongListFieldGroup['key'] = (
      SONG_BASIC_FIELDS as readonly string[]
    ).includes(field)
      ? 'basic'
      : (field as Exclude<SongListField, (typeof SONG_BASIC_FIELDS)[number]>)
    const group = groups.get(key) ?? { key, fields: [] }
    group.fields.push(field)
    groups.set(key, group)
  }
  return [...groups.values()]
}

export interface SongListConditions {
  q: string
  character: string[]
  category: number[]
  singerType: number[]
  difficulty: number[]
  levelMin: number | null
  levelMax: number | null
  sort: SongListSort
  direction: 'asc' | 'desc'
}

export interface SongFilterOptions {
  character: string[]
  category: number[]
  singerType: number[]
  difficulty: number[]
}

const sortKeys: readonly SongListSort[] = [
  'order',
  'title',
  'startTime',
  'playingSeconds',
  'level',
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
  'sort',
  'direction',
])

export function getSongFilterOptions(
  songs: readonly SongListItemData[],
): SongFilterOptions {
  return {
    character: [...new Set(songs.flatMap((song) => song.characterIds))].sort(),
    category: [...new Set(songs.map((song) => song.categoryType))].sort(
      (a, b) => a - b,
    ),
    singerType: [...new Set(songs.map((song) => song.musicSingerType))].sort(
      (a, b) => a - b,
    ),
    difficulty: [
      ...new Set(
        songs.flatMap((song) => song.difficulties.map(({ type }) => type)),
      ),
    ].sort((a, b) => a - b),
  }
}

export function createSongListConditions(
  options: SongFilterOptions,
): SongListConditions {
  return {
    q: '',
    character: [],
    category: [...options.category],
    singerType: [...options.singerType],
    difficulty: [...options.difficulty],
    levelMin: null,
    levelMax: null,
    sort: 'order',
    direction: 'desc',
  }
}

function queryValues(value: LocationQuery[string] | undefined): string[] {
  return (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === 'string',
  )
}

function uniqueValid<T extends string | number>(
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

function checkboxSelection<T extends string | number>(
  value: LocationQuery[string] | undefined,
  allowed: readonly T[],
  parse: (value: string) => T | null,
): T[] {
  if (value === undefined) return [...allowed]
  const values = queryValues(value)
  if (values.includes('')) return []
  return uniqueValid(values, allowed, parse)
}

function parseLevel(value: LocationQuery[string] | undefined): number | null {
  const raw = queryValues(value)[0]
  return raw === undefined ? null : integer(raw)
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
  conditions.levelMin = parseLevel(query.levelMin)
  conditions.levelMax = parseLevel(query.levelMax)
  if (
    conditions.levelMin !== null &&
    conditions.levelMax !== null &&
    conditions.levelMin > conditions.levelMax
  ) {
    ;[conditions.levelMin, conditions.levelMax] = [
      conditions.levelMax,
      conditions.levelMin,
    ]
  }
  const sort = queryValues(query.sort)[0]
  if (sort && sortKeys.includes(sort as SongListSort)) {
    conditions.sort = sort as SongListSort
  }
  const direction = queryValues(query.direction)[0]
  if (direction === 'asc' || direction === 'desc') {
    conditions.direction = direction
  }
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
  if (conditions.character.length) {
    query.character = [...new Set(conditions.character)]
  }
  for (const key of ['category', 'singerType', 'difficulty'] as const) {
    const selected = conditions[key]
    if (!sameSelection(selected, options[key])) {
      query[key] = selected.length ? [...new Set(selected)].map(String) : ''
    }
  }
  const [levelMin, levelMax] = normalizedLevelRange(conditions)
  if (levelMin !== null) query.levelMin = String(levelMin)
  if (levelMax !== null) query.levelMax = String(levelMax)
  if (conditions.sort !== 'order') query.sort = conditions.sort
  if (conditions.direction !== 'desc') query.direction = conditions.direction
  return query
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function localized(value: Record<string, string> | null, locale: GameLocale) {
  if (!value) return ''
  return (
    value[locale] ||
    value.jpn ||
    value.eng ||
    Object.values(value).find(Boolean) ||
    ''
  )
}

function songSearchText(song: SongListItemData): string {
  return [
    ...Object.values(song.title),
    ...(song.singerName ? Object.values(song.singerName) : []),
    ...song.characterIds,
  ]
    .join('\n')
    .toLowerCase()
}

function matchingCharts(
  song: SongListItemData,
  conditions: SongListConditions,
) {
  const [levelMin, levelMax] = normalizedLevelRange(conditions)
  return song.difficulties.filter(
    (chart) =>
      conditions.difficulty.includes(chart.type) &&
      (levelMin === null || chart.level >= levelMin) &&
      (levelMax === null || chart.level <= levelMax),
  )
}

function normalizedLevelRange(conditions: SongListConditions) {
  const { levelMin, levelMax } = conditions
  if (levelMin !== null && levelMax !== null && levelMin > levelMax) {
    return [levelMax, levelMin] as const
  }
  return [levelMin, levelMax] as const
}

export function filterAndSortSongs(
  songs: readonly SongListItemData[],
  conditions: SongListConditions,
  gameLocale: GameLocale,
  searchTextBySongId?: Readonly<Record<string, string>>,
): SongListItemData[] {
  const tokens = conditions.q.toLowerCase().trim().split(/\s+/u).filter(Boolean)
  const direction = conditions.direction === 'asc' ? 1 : -1
  const chartsById = new Map<string, SongListItemData['difficulties']>()
  const filtered = songs.filter((song) => {
    if (tokens.length) {
      const text = (
        searchTextBySongId?.[song.id] ?? songSearchText(song)
      ).toLowerCase()
      if (!tokens.every((token) => text.includes(token))) return false
    }
    if (
      conditions.character.length &&
      !song.characterIds.some((id) => conditions.character.includes(id))
    )
      return false
    if (!conditions.category.includes(song.categoryType)) return false
    if (!conditions.singerType.includes(song.musicSingerType)) return false
    const charts = matchingCharts(song, conditions)
    if (!charts.length) return false
    chartsById.set(song.id, charts)
    return true
  })
  return filtered.sort((a, b) => {
    let comparison = 0
    switch (conditions.sort) {
      case 'title':
        comparison = compareText(
          localized(a.title, gameLocale),
          localized(b.title, gameLocale),
        )
        break
      case 'startTime':
        comparison = Number(a.startTime ?? 0) - Number(b.startTime ?? 0)
        break
      case 'playingSeconds':
        comparison = a.playingSeconds - b.playingSeconds
        break
      case 'level':
        comparison =
          Math.max(...chartsById.get(a.id)!.map(({ level }) => level)) -
          Math.max(...chartsById.get(b.id)!.map(({ level }) => level))
        break
      case 'notes':
        comparison =
          Math.max(
            ...chartsById
              .get(a.id)!
              .map(({ fullComboNoteCount }) => fullComboNoteCount),
          ) -
          Math.max(
            ...chartsById
              .get(b.id)!
              .map(({ fullComboNoteCount }) => fullComboNoteCount),
          )
        break
      case 'order':
        comparison = a.order - b.order
        break
    }
    if (comparison) return comparison * direction
    return b.order - a.order || compareText(a.id, b.id)
  })
}

export function getAvailableSongs(
  songs: readonly SongListItemData[],
  now: number | Date,
): SongListItemData[] {
  const time = now instanceof Date ? now.getTime() : now
  return songs.filter((song) => {
    if (song.isTutorial === true) return false
    if (song.startTime === null) return true
    const start = Number(song.startTime)
    return Number.isFinite(start) && start <= time
  })
}

export function getSongImageUrl(jacketAssetId: string): string {
  const name = `img_music_jacket_${jacketAssetId}`
  return `https://assets.holodori.net/cdn/${name}/Texture2D/${name}.webp`
}
