import { describe, expect, it } from 'vitest'
import type { SongListItemData } from '../shared/game-data/songs.ts'
import {
  createSongListConditions,
  filterAndSortSongs,
  getAvailableSongs,
  getSongFilterOptions,
  getSongImageUrl,
  getSongUnlockType,
  hasSongLive,
  hasSongMv,
  parseSongListQuery,
  SONG_LIST_FIELDS,
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
    isStreamingMuted: false,
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
  unlock: ['member', 'shop', 'none', 'main'],
  video: ['mv', 'live', 'none'],
}

describe('song list logic', () => {
  it('keeps display fields in their fixed visual order', () => {
    expect(SONG_LIST_FIELDS).toEqual([
      'category',
      'duration',
      'charts',
      'title',
      'singer',
      'notes',
      'unlock',
      'availability',
      'musicVideos',
      'streamingMute',
    ])
  })

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
      notesDifficulty: [1, 2, 3, 4],
      notesMin: null,
      notesMax: null,
      durationMin: null,
      durationMax: null,
      streamingMute: [true, false],
      video: ['mv', 'live', 'none'],
      unlock: ['member', 'shop', 'none', 'main'],
      sort: 'startTime',
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
          notesDifficulty: ['2'],
          levelMin: '18',
          levelMax: '10',
          notesMin: '900',
          notesMax: '100',
          durationMin: '200',
          durationMax: '100',
          streamingMute: 'true',
          video: ['live', 'none'],
          unlock: ['none', 'missing'],
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
      notesDifficulty: [2],
      levelMin: 10,
      levelMax: 18,
      notesMin: 100,
      notesMax: 900,
      durationMin: 100,
      durationMax: 200,
      streamingMute: [true],
      video: ['live', 'none'],
      unlock: ['none'],
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
    conditions.sort = 'levelExpert'
    expect(toSongListQuery(conditions, options, { custom: 'x' })).toEqual({
      custom: 'x',
      character: ['chr-a'],
      category: '',
      levelMin: '4',
      sort: 'levelExpert',
    })
  })

  it('filters muted songs with checkbox selections and supports empty selection', () => {
    const songs = [
      base({ id: 'muted', isStreamingMuted: true }),
      base({ id: 'not-muted', isStreamingMuted: false }),
    ]
    const conditions = createSongListConditions(options)

    expect(filterAndSortSongs(songs, conditions, 'eng')).toHaveLength(2)
    conditions.streamingMute = [true]
    expect(
      filterAndSortSongs(songs, conditions, 'eng').map(({ id }) => id),
    ).toEqual(['muted'])
    conditions.streamingMute = [false]
    expect(
      filterAndSortSongs(songs, conditions, 'eng').map(({ id }) => id),
    ).toEqual(['not-muted'])
    conditions.streamingMute = []
    expect(filterAndSortSongs(songs, conditions, 'eng')).toEqual([])
  })

  it('reads repeated streaming mute selections, boolean links, and empty query', () => {
    expect(
      parseSongListQuery({ streamingMute: ['false', 'true', 'false'] }, options)
        .streamingMute,
    ).toEqual([false, true])
    expect(
      parseSongListQuery({ streamingMute: 'true' }, options).streamingMute,
    ).toEqual([true])
    expect(
      parseSongListQuery({ streamingMute: 'false' }, options).streamingMute,
    ).toEqual([false])
    expect(
      parseSongListQuery({ streamingMute: '' }, options).streamingMute,
    ).toEqual([])
    expect(
      parseSongListQuery({ streamingMute: 'other' }, options).streamingMute,
    ).toEqual([])
  })

  it('omits both streaming mute values and serializes one or zero selections', () => {
    const conditions = createSongListConditions(options)
    expect(toSongListQuery(conditions, options)).toEqual({})

    conditions.streamingMute = [true]
    expect(toSongListQuery(conditions, options)).toEqual({
      streamingMute: ['true'],
    })
    conditions.streamingMute = []
    expect(toSongListQuery(conditions, options)).toEqual({ streamingMute: '' })
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
    conditions.sort = 'levelExpert'
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
    ).toEqual(['nine-hundred', 'ten-thousand'])
    conditions.levelMin = 20
    conditions.levelMax = 10
    expect(
      filterAndSortSongs(songs, conditions, 'eng').map(({ id }) => id),
    ).toEqual(['nine-hundred', 'ten-thousand'])
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

  it('round trips independent filters, booleans, ranges, and legacy level sorting', () => {
    const conditions = createSongListConditions(options)
    conditions.notesDifficulty = [2, 4]
    conditions.notesMin = 1000
    conditions.durationMax = 220
    conditions.streamingMute = [false]
    conditions.video = ['mv']
    conditions.unlock = ['main']
    conditions.sort = 'levelHard'
    const query = toSongListQuery(conditions, options, {
      custom: 'x',
      hash: '#keep',
    } as never)
    expect(query).toMatchObject({
      custom: 'x',
      notesDifficulty: ['2', '4'],
      notesMin: '1000',
      durationMax: '220',
      streamingMute: ['false'],
      video: ['mv'],
      unlock: ['main'],
      sort: 'levelHard',
    })
    expect(parseSongListQuery(query, options)).toMatchObject(conditions)
    expect(parseSongListQuery({ sort: 'level' }, options).sort).toBe(
      'levelExpert',
    )
  })

  it('sorts by each of the four chart difficulties', () => {
    const chart = (type: number, level: number) => ({
      type,
      level,
      chartAssetId: '',
      unlockConditionGroupId: null,
      fullComboNoteCount: 100,
      maxComboCountRewardThreshold: 0,
    })
    const songs = [
      base({
        id: 'a',
        difficulties: [chart(1, 10), chart(2, 30), chart(3, 15), chart(4, 20)],
      }),
      base({
        id: 'b',
        difficulties: [chart(1, 12), chart(2, 25), chart(3, 18), chart(4, 19)],
      }),
    ]
    const conditions = createSongListConditions(options)
    conditions.difficulty = [1, 2, 3, 4]
    for (const [sort, expected] of [
      ['levelEasy', ['b', 'a']],
      ['levelNormal', ['a', 'b']],
      ['levelHard', ['b', 'a']],
      ['levelExpert', ['a', 'b']],
    ] as const) {
      conditions.sort = sort
      expect(
        filterAndSortSongs(songs, conditions, 'eng').map(({ id }) => id),
      ).toEqual(expected)
    }
  })

  it('sorts notes by the highest selected chart inside the note range', () => {
    const chart = (type: number, count: number) => ({
      type,
      level: 10,
      chartAssetId: '',
      unlockConditionGroupId: null,
      fullComboNoteCount: count,
      maxComboCountRewardThreshold: 0,
    })
    const songs = [
      base({ id: 'a', difficulties: [chart(1, 100), chart(2, 800)] }),
      base({ id: 'b', difficulties: [chart(1, 700), chart(2, 900)] }),
    ]
    const conditions = createSongListConditions(options)
    conditions.sort = 'notes'
    conditions.direction = 'desc'
    conditions.difficulty = [1]
    conditions.notesDifficulty = [1, 2]
    conditions.notesMin = 650
    conditions.notesMax = 850
    expect(
      filterAndSortSongs(songs, conditions, 'eng').map(({ id }) => id),
    ).toEqual(['a', 'b'])
    conditions.notesMin = null
    conditions.notesMax = null
    expect(
      filterAndSortSongs(songs, conditions, 'eng').map(({ id }) => id),
    ).toEqual(['b', 'a'])
  })

  it('matches note ranges against their own selected difficulty and separates video categories', () => {
    const song = base({
      isStreamingMuted: true,
      difficulties: [
        {
          type: 1,
          level: 12,
          chartAssetId: '',
          unlockConditionGroupId: null,
          fullComboNoteCount: 400,
          maxComboCountRewardThreshold: 0,
        },
        {
          type: 2,
          level: 18,
          chartAssetId: '',
          unlockConditionGroupId: null,
          fullComboNoteCount: 500,
          maxComboCountRewardThreshold: 0,
        },
      ],
      musicVideos: [
        {
          number: 1,
          categoryId: 'music_mv_category-live',
          assetId: 'live',
          slideAssetId: null,
          slideAssetCount: null,
          name: null,
          thumbnailAssetId: '',
          conditionGroupId: null,
          description: null,
          order: 1,
        },
        {
          number: 2,
          categoryId: 'music_mv_category-mv_light',
          assetId: null,
          slideAssetId: 'slide',
          slideAssetCount: 20,
          name: null,
          thumbnailAssetId: '',
          conditionGroupId: null,
          description: null,
          order: 2,
        },
      ],
    })
    const conditions = createSongListConditions(options)
    conditions.difficulty = [1]
    conditions.notesDifficulty = [2]
    conditions.notesMin = 400
    conditions.video = ['live']
    conditions.streamingMute = [true]
    expect(hasSongMv(song)).toBe(false)
    expect(hasSongLive(song)).toBe(true)
    expect(filterAndSortSongs([song], conditions, 'eng')).toHaveLength(1)
    conditions.notesMin = 600
    expect(filterAndSortSongs([song], conditions, 'eng')).toHaveLength(0)
  })

  it('classifies unlock types without guessing unknown locked songs as none', () => {
    expect(getSongUnlockType(base({ releaseType: 1 }))).toBe('none')
    expect(getSongUnlockType(base({ releaseType: 2 }))).toBe('shop')
    expect(
      getSongUnlockType(
        base({ releaseType: 3, lockDescription: { jpn: 'メンバーの楽曲' } }),
      ),
    ).toBe('member')
    expect(
      getSongUnlockType(
        base({ releaseType: 3, lockDescription: { jpn: 'ホロメンを所持' } }),
      ),
    ).toBe('member')
    expect(
      getSongUnlockType(
        base({ releaseType: 3, lockDescription: { eng: 'Own one Holomem' } }),
      ),
    ).toBe('member')
    expect(
      getSongUnlockType(
        base({ releaseType: 3, lockDescription: { eng: 'Story progress' } }),
      ),
    ).toBe('main')
    expect(
      getSongUnlockType(
        base({ releaseType: 3, lockDescription: { eng: 'Unknown condition' } }),
      ),
    ).toBe('other')
  })
})
