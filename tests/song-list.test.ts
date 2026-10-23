import { describe, expect, it } from 'vitest'
import type { SongListItemData } from '../shared/game-data/songs.ts'
import {
  createSongListConditions,
  filterAndSortSongs,
  getAvailableSongs,
  getSongFilterOptions,
  getSongImageUrl,
  parseSongListQuery,
  toSongListQuery,
  type SongFilterOptions,
} from '../shared/game-data/song-list.ts'

const base = (overrides: Partial<SongListItemData> = {}) =>
  ({
    id: 'song-a',
    title: {
      jpn: 'Sakura',
      eng: 'Cherry',
      ind: 'Sakura',
      kor: '사쿠라',
      cht: '櫻花',
      chs: '樱花',
    },
    titleRuby: {},
    subtitle: null,
    description: null,
    lyricist: null,
    lyricistRuby: null,
    composer: null,
    composerRuby: null,
    arranger: null,
    arrangerRuby: null,
    jacketAssetId: '0000123',
    startTime: '1704067200000',
    playingSeconds: 120,
    categoryType: 1,
    scoreCoefficientPermil: null,
    singleScoreRankGroupId: '',
    multiScoreRankGroupId: '',
    comboGroupId: '',
    releaseType: 0,
    requiredReleaseItemQuantity: null,
    lockDescription: null,
    isHighestScoreRatingTarget: null,
    isTutorial: false,
    mvUrl: null,
    mvThumbnailAssetId: null,
    copyright: null,
    musicSingerType: 1,
    characterIds: ['chr-a'],
    singerName: null,
    singerNameRuby: null,
    chorusStartMillisecond: null,
    chorusEndMillisecond: null,
    order: 1,
    difficulties: [
      {
        type: 1,
        level: 12,
        chartAssetId: 'chart',
        unlockConditionGroupId: null,
        fullComboNoteCount: 400,
        maxComboCountRewardThreshold: 400,
      },
    ],
    musicVideos: [],
    ...overrides,
  }) as SongListItemData

const options: SongFilterOptions = {
  character: ['chr-a', 'chr-b'],
  category: [1, 2],
  singerType: [1],
  difficulty: [1],
}

describe('song list logic', () => {
  it('derives unique sorted filters and creates unrestricted defaults', () => {
    const songs = [
      base(),
      base({ id: 'song-b', categoryType: 2, characterIds: ['chr-b'] }),
    ]
    expect(getSongFilterOptions(songs)).toEqual(options)
    expect(createSongListConditions(options)).toEqual({
      q: '',
      character: [],
      category: [1, 2],
      singerType: [1],
      difficulty: [1],
      levelMin: null,
      levelMax: null,
      sort: 'order',
      direction: 'desc',
    })
  })

  it('parses valid query selections, ignores unknowns and swaps reversed levels', () => {
    expect(
      parseSongListQuery(
        {
          q: '  Sakura ',
          character: ['chr-b', 'missing', 'chr-b'],
          category: ['2', '999'],
          singerType: '',
          difficulty: ['4', '1'],
          levelMin: '18',
          levelMax: '10',
          sort: 'notes',
          direction: 'asc',
          custom: 'keep',
        },
        options,
      ),
    ).toEqual({
      q: 'Sakura',
      character: ['chr-b'],
      category: [2],
      singerType: [],
      difficulty: [1],
      levelMin: 10,
      levelMax: 18,
      sort: 'notes',
      direction: 'asc',
    })
    expect(
      parseSongListQuery({ category: ['unknown'] }, options).category,
    ).toEqual([])
  })

  it('serializes non-default conditions while preserving unrelated query keys', () => {
    const conditions = createSongListConditions(options)
    conditions.character = ['chr-a']
    conditions.category = []
    conditions.levelMin = 4
    conditions.sort = 'level'
    expect(toSongListQuery(conditions, options, { custom: 'x' })).toEqual({
      custom: 'x',
      character: ['chr-a'],
      category: '',
      levelMin: '4',
      sort: 'level',
    })
  })

  it('filters by localized search, character, and any matching chart in the level range', () => {
    const songs = [
      base({
        id: 'low',
        difficulties: [
          {
            type: 1,
            level: 9,
            chartAssetId: '',
            unlockConditionGroupId: null,
            fullComboNoteCount: 200,
            maxComboCountRewardThreshold: 0,
          },
        ],
      }),
      base({
        id: 'match',
        characterIds: ['chr-b'],
        difficulties: [
          {
            type: 1,
            level: 9,
            chartAssetId: '',
            unlockConditionGroupId: null,
            fullComboNoteCount: 200,
            maxComboCountRewardThreshold: 0,
          },
          {
            type: 3,
            level: 15,
            chartAssetId: '',
            unlockConditionGroupId: null,
            fullComboNoteCount: 500,
            maxComboCountRewardThreshold: 0,
          },
        ],
      }),
    ]
    const conditions = createSongListConditions(options)
    conditions.q = 'cherry sakura'
    conditions.character = ['chr-b']
    conditions.difficulty = [3]
    conditions.levelMin = 15
    conditions.levelMax = 15
    expect(
      filterAndSortSongs(songs, conditions, 'eng', {
        match: 'Sakura Cherry',
        low: 'Sakura Cherry',
      }).map(({ id }) => id),
    ).toEqual(['match'])
  })

  it('sorts by maxima among matching charts and uses stable order tie breaks', () => {
    const songs = [
      base({
        id: 'a',
        order: 1,
        difficulties: [
          {
            type: 1,
            level: 10,
            chartAssetId: '',
            unlockConditionGroupId: null,
            fullComboNoteCount: 300,
            maxComboCountRewardThreshold: 0,
          },
          {
            type: 2,
            level: 20,
            chartAssetId: '',
            unlockConditionGroupId: null,
            fullComboNoteCount: 900,
            maxComboCountRewardThreshold: 0,
          },
        ],
      }),
      base({
        id: 'b',
        order: 4,
        difficulties: [
          {
            type: 1,
            level: 15,
            chartAssetId: '',
            unlockConditionGroupId: null,
            fullComboNoteCount: 500,
            maxComboCountRewardThreshold: 0,
          },
        ],
      }),
    ]
    const conditions = createSongListConditions(options)
    conditions.sort = 'level'
    conditions.difficulty = [1]
    expect(
      filterAndSortSongs(songs, conditions, 'jpn').map(({ id }) => id),
    ).toEqual(['b', 'a'])
  })

  it('sorts Unix start times numerically and uses matching-chart note maxima', () => {
    const songs = [
      base({
        id: 'ten-thousand',
        order: 1,
        startTime: '10000',
        difficulties: [
          {
            type: 1,
            level: 10,
            chartAssetId: '',
            unlockConditionGroupId: null,
            fullComboNoteCount: 100,
            maxComboCountRewardThreshold: 0,
          },
          {
            type: 2,
            level: 30,
            chartAssetId: '',
            unlockConditionGroupId: null,
            fullComboNoteCount: 900,
            maxComboCountRewardThreshold: 0,
          },
        ],
      }),
      base({
        id: 'nine-hundred',
        order: 2,
        startTime: '900',
        difficulties: [
          {
            type: 1,
            level: 10,
            chartAssetId: '',
            unlockConditionGroupId: null,
            fullComboNoteCount: 200,
            maxComboCountRewardThreshold: 0,
          },
        ],
      }),
    ]
    const conditions = createSongListConditions(options)
    conditions.sort = 'startTime'
    conditions.direction = 'asc'
    expect(
      filterAndSortSongs(songs, conditions, 'eng').map(({ id }) => id),
    ).toEqual(['nine-hundred', 'ten-thousand'])
    conditions.sort = 'notes'
    conditions.difficulty = [1]
    expect(
      filterAndSortSongs(songs, conditions, 'eng').map(({ id }) => id),
    ).toEqual(['ten-thousand', 'nine-hundred'])
    conditions.levelMin = 20
    conditions.levelMax = 10
    expect(
      filterAndSortSongs(songs, conditions, 'eng').map(({ id }) => id),
    ).toEqual(['ten-thousand', 'nine-hundred'])
    expect(toSongListQuery(conditions, options)).toMatchObject({
      levelMin: '10',
      levelMax: '20',
    })
  })

  it('excludes tutorials and unavailable or invalid timestamps while allowing null start time', () => {
    const songs = [
      base({ id: 'before', startTime: '1735689599999' }),
      base({ id: 'exact', startTime: '1735689600000' }),
      base({ id: 'null', startTime: null }),
      base({ id: 'after', startTime: '1735689600001' }),
      base({ id: 'bad', startTime: 'not a date' }),
      base({ id: 'tutorial', isTutorial: true }),
    ]
    expect(getAvailableSongs(songs, 1735689600000).map(({ id }) => id)).toEqual(
      ['before', 'exact', 'null'],
    )
  })

  it('builds jacket URLs with the original asset identifier', () => {
    expect(getSongImageUrl('0000123')).toBe(
      'https://assets.holodori.net/cdn/img_music_jacket_0000123/Texture2D/img_music_jacket_0000123.webp',
    )
  })
})
