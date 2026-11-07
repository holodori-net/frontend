import type { GameLocale } from '../../language.ts'
import type { SongListItemData } from '../songs.ts'

export type SongUnlockType = 'member' | 'shop' | 'none' | 'main' | 'other'
export type SongVideoKind = 'mv' | 'live' | 'none'
export type SongListSort =
  | 'order'
  | 'title'
  | 'startTime'
  | 'playingSeconds'
  | 'levelEasy'
  | 'levelNormal'
  | 'levelHard'
  | 'levelExpert'
  | 'notes'

export interface SongListConditions {
  q: string
  character: string[]
  category: number[]
  singerType: number[]
  difficulty: number[]
  levelMin: number | null
  levelMax: number | null
  notesDifficulty: number[]
  notesMin: number | null
  notesMax: number | null
  durationMin: number | null
  durationMax: number | null
  streamingMute: boolean[]
  video: SongVideoKind[]
  unlock: SongUnlockType[]
  sort: SongListSort
  direction: 'asc' | 'desc'
}

export interface SongFilterOptions {
  character: string[]
  category: number[]
  singerType: number[]
  difficulty: number[]
  unlock: Exclude<SongUnlockType, 'other'>[]
  video: SongVideoKind[]
}

const ALL_UNLOCK_TYPES = ['member', 'shop', 'none', 'main'] as const
const ALL_VIDEO_TYPES: SongVideoKind[] = ['mv', 'live', 'none']

export function hasSongVideo(song: SongListItemData): boolean {
  return song.musicVideos.some((video) => Boolean(video.assetId?.trim()))
}

export function hasSongMv(song: SongListItemData): boolean {
  return song.musicVideos.some(
    (video) =>
      video.categoryId === 'music_mv_category-mv' &&
      Boolean(video.assetId?.trim()),
  )
}

export function hasSongLive(song: SongListItemData): boolean {
  return song.musicVideos.some(
    (video) =>
      video.categoryId === 'music_mv_category-live' &&
      Boolean(video.assetId?.trim()),
  )
}

export function getSongUnlockType(song: SongListItemData): SongUnlockType {
  if (song.releaseType === 1) return 'none'
  if (song.releaseType === 2) return 'shop'
  if (song.releaseType !== 3) return 'other'
  const text = Object.values(song.lockDescription ?? {})
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (!text) return 'other'
  if (
    /ホロメン|メンバー|holomem|member|character|キャラクター|角色|成員|成员/.test(
      text,
    )
  )
    return 'member'
  if (/メイン|main|ストーリー|story|主線|主线/.test(text)) return 'main'
  return 'other'
}

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
    unlock: [...ALL_UNLOCK_TYPES],
    video: ALL_VIDEO_TYPES,
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
    notesDifficulty: [1, 2, 3, 4],
    notesMin: null,
    notesMax: null,
    durationMin: null,
    durationMax: null,
    streamingMute: [true, false],
    video: [...options.video],
    unlock: [...options.unlock],
    sort: 'startTime',
    direction: 'desc',
  }
}

function normalizeRange(
  min: number | null,
  max: number | null,
): [number | null, number | null] {
  return min !== null && max !== null && min > max ? [max, min] : [min, max]
}

function sameSelection<T>(selection: readonly T[], options: readonly T[]) {
  const selected = new Set(selection)
  const available = new Set(options)
  return (
    selected.size === available.size &&
    [...available].every((item) => selected.has(item))
  )
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

export function getMatchingSongCharts(
  song: SongListItemData,
  conditions: SongListConditions,
) {
  const [levelMin, levelMax] = normalizeRange(
    conditions.levelMin,
    conditions.levelMax,
  )
  return song.difficulties.filter(
    (chart) =>
      conditions.difficulty.includes(chart.type) &&
      (levelMin === null || chart.level >= levelMin) &&
      (levelMax === null || chart.level <= levelMax),
  )
}

function matchesChartRange(
  song: SongListItemData,
  difficulty: readonly number[],
  min: number | null,
  max: number | null,
  value: (chart: SongListItemData['difficulties'][number]) => number,
) {
  const [rangeMin, rangeMax] = normalizeRange(min, max)
  return song.difficulties.some(
    (chart) =>
      difficulty.includes(chart.type) &&
      (rangeMin === null || value(chart) >= rangeMin) &&
      (rangeMax === null || value(chart) <= rangeMax),
  )
}

function songSearchText(song: SongListItemData): string {
  return [
    ...Object.values(song.title),
    ...(song.singerName ? Object.values(song.singerName) : []),
    ...song.characterIds,
    ...Object.values(song.lockDescription ?? {}),
    ...song.musicVideos.flatMap((video) => [
      ...Object.values(video.name ?? {}),
      ...Object.values(video.description ?? {}),
    ]),
  ]
    .join('\n')
    .toLowerCase()
}

export function filterAndSortSongs(
  songs: readonly SongListItemData[],
  conditions: SongListConditions,
  gameLocale: GameLocale,
  searchTextBySongId?: Readonly<Record<string, string>>,
): SongListItemData[] {
  const tokens = conditions.q.toLowerCase().trim().split(/\s+/u).filter(Boolean)
  const direction = conditions.direction === 'asc' ? 1 : -1
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
    if (
      !conditions.category.includes(song.categoryType) ||
      !conditions.singerType.includes(song.musicSingerType)
    )
      return false
    const charts = getMatchingSongCharts(song, conditions)
    if (!charts.length) return false
    if (conditions.notesMin !== null || conditions.notesMax !== null) {
      if (
        !matchesChartRange(
          song,
          conditions.notesDifficulty,
          conditions.notesMin,
          conditions.notesMax,
          (chart) => chart.fullComboNoteCount,
        )
      )
        return false
    }
    if (
      conditions.durationMin !== null &&
      song.playingSeconds < conditions.durationMin
    )
      return false
    if (
      conditions.durationMax !== null &&
      song.playingSeconds > conditions.durationMax
    )
      return false
    if (!conditions.streamingMute.includes(song.isStreamingMuted)) return false
    if (!sameSelection(conditions.video, ALL_VIDEO_TYPES)) {
      const hasMv = hasSongMv(song)
      const hasLive = hasSongLive(song)
      if (
        !conditions.video.some((kind) =>
          kind === 'mv'
            ? hasMv
            : kind === 'live'
              ? hasLive
              : !hasMv && !hasLive,
        )
      )
        return false
    }
    if (!sameSelection(conditions.unlock, ALL_UNLOCK_TYPES)) {
      if (!conditions.unlock.includes(getSongUnlockType(song))) return false
    }
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
      case 'levelEasy':
      case 'levelNormal':
      case 'levelHard':
      case 'levelExpert': {
        const type =
          conditions.sort === 'levelEasy'
            ? 1
            : conditions.sort === 'levelNormal'
              ? 2
              : conditions.sort === 'levelHard'
                ? 3
                : 4
        const levelFor = (song: SongListItemData) =>
          Math.max(
            0,
            ...song.difficulties
              .filter((chart) => chart.type === type)
              .map(({ level }) => level),
          )
        comparison = levelFor(a) - levelFor(b)
        break
      }
      case 'notes': {
        const [notesMin, notesMax] = normalizeRange(
          conditions.notesMin,
          conditions.notesMax,
        )
        const noteCount = (song: SongListItemData) =>
          Math.max(
            0,
            ...song.difficulties
              .filter((chart) =>
                conditions.notesDifficulty.includes(chart.type),
              )
              .filter(
                (chart) =>
                  (notesMin === null || chart.fullComboNoteCount >= notesMin) &&
                  (notesMax === null || chart.fullComboNoteCount <= notesMax),
              )
              .map(({ fullComboNoteCount }) => fullComboNoteCount),
          )
        comparison = noteCount(a) - noteCount(b)
        break
      }
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
