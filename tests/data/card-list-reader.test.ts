import { DatabaseSync } from 'node:sqlite'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import type { CardData } from '../../shared/game-data/cards.ts'
import type { CardGrowthData } from '../../shared/game-data/card-growth.ts'
import type { CharacterData } from '../../shared/game-data/characters.ts'
import type { LiveSkillData } from '../../shared/game-data/live-skills.ts'
import type { CardSkillData } from '../../shared/game-data/card-skills.ts'
import type { SkillTreeConnectData } from '../../shared/game-data/skill-tree-connect-effects.ts'
import type { LocalizedNames } from '../../shared/game-data/localized-text.ts'
import { readCardList } from '../../server/data/card-list.ts'
import { transformCardGrowth } from '../../server/data/converters/card-growth.ts'
import { transformCards } from '../../server/data/converters/cards.ts'
import { transformCharacters } from '../../server/data/converters/characters.ts'
import { transformLiveSkillData } from '../../server/data/converters/live-skills.ts'
import { transformCardSkillData } from '../../server/data/converters/card-skills.ts'
import { transformSkillTreeConnectEffects } from '../../server/data/converters/skill-tree-connect-effects.ts'

vi.mock('../../server/data/converters/cards.ts', () => ({
  transformCards: vi.fn(),
}))
vi.mock('../../server/data/converters/characters.ts', () => ({
  transformCharacters: vi.fn(),
}))
vi.mock('../../server/data/converters/card-growth.ts', () => ({
  transformCardGrowth: vi.fn(),
}))
vi.mock('../../server/data/converters/live-skills.ts', () => ({
  transformLiveSkillData: vi.fn(),
}))
vi.mock('../../server/data/converters/card-skills.ts', () => ({
  transformCardSkillData: vi.fn(),
}))
vi.mock('../../server/data/converters/skill-tree-connect-effects.ts', () => ({
  transformSkillTreeConnectEffects: vi.fn(),
}))

const transformCardsMock = vi.mocked(transformCards)
const transformCharactersMock = vi.mocked(transformCharacters)
const transformCardGrowthMock = vi.mocked(transformCardGrowth)
const transformLiveSkillDataMock = vi.mocked(transformLiveSkillData)
const transformCardSkillDataMock = vi.mocked(transformCardSkillData)
const transformConnectDataMock = vi.mocked(transformSkillTreeConnectEffects)

const names: LocalizedNames = {
  jpn: '櫻巫女',
  eng: 'Sakura Miko',
  ind: 'Sakura Miko',
  kor: '사쿠라 미코',
  cht: '櫻巫女',
  chs: '樱巫女',
}

function createCard(overrides: Partial<CardData> = {}): CardData {
  return {
    id: 'card-1',
    characterId: 'chr-1',
    rewardCostumeId: null,
    livePassiveSkillId: 'passive-1',
    liveActiveSkillId: 'active-1',
    liveSpecialSkillId: 'special-1',
    skillTreeConnectEffectId: null,
    name: names,
    rarity: 5,
    attributeType: 2,
    assetId: 'asset-1',
    assetType: 0,
    verticalAnchorType: 0,
    horizontalAnchorType: 0,
    order: 3,
    growth: {
      levelGroupId: 'level-group',
      levelLimitGroupId: 'limit-group',
      potentialGroupId: 'potential-group',
      weightsPermil: { performance: 400, technique: 300, sense: 300 },
    },
    ...overrides,
  }
}

function createCharacter(
  overrides: Partial<CharacterData> = {},
): CharacterData {
  return {
    id: 'chr-1',
    name: names,
    shortName: names,
    productionId: 'prd-jp',
    birthday: { month: 3, day: 5 },
    debutDate: { year: 2018, month: 8, day: 1 },
    fanName: null,
    description: null,
    comment: null,
    youtubeUrl: null,
    xUrl: null,
    personalityType: null,
    sdPersonalityType: null,
    assetId: null,
    isPlayable: true,
    regularGroupIds: [],
    regularGroupName: null,
    order: 7,
    dominantHandType: 0,
    isTutorial: null,
    defaultCostumeId: 'costume-1',
    defaultSdCostumeId: '',
    bgmAssetId: null,
    color1: null,
    color2: null,
    color3: null,
    color4: null,
    color5: null,
    growth: {
      levelGroupId: null,
      skillTreeNodePositionGroupId: null,
      skillTreePointId: null,
    },
    ...overrides,
  }
}

function createLiveSkills(): LiveSkillData {
  return {
    costumes: [
      {
        id: 'costume-1',
        characterId: 'chr-1',
        name: names,
        liveLeaderSkillId: null,
      },
      {
        id: 'costume-2',
        characterId: 'chr-2',
        name: names,
        liveLeaderSkillId: null,
      },
    ],
    leaderSkills: [],
    effects: {},
    triggers: {},
    targets: [],
    catalog: {
      templates: {},
      labels: { character: {}, group: {}, attribute: {}, judgement: {} },
    },
    pendingDescriptions: [],
  }
}

function createCardSkills(): CardSkillData {
  return {
    passiveSkills: Object.fromEntries(
      ['passive-1'].map((id) => [
        id,
        [
          {
            livePassiveSkillId: id,
            level: 1,
            liveSkillTriggerGroupId: null,
            livePassiveSkillEffectGroupId: 'p-effect',
            additionalLiveSkillTriggerGroupId: null,
            additionalLivePassiveSkillEffectGroupId: null,
          },
        ],
      ]),
    ),
    activeSkills: Object.fromEntries(
      ['active-1'].map((id) => [
        id,
        [
          {
            liveActiveSkillId: id,
            level: 1,
            liveSkillTriggerGroupId: null,
            liveActiveSkillEffectGroupId: 'a-effect',
            additionalLiveSkillTriggerGroupId: null,
            additionalLiveActiveSkillEffectGroupId: null,
            coolTimeMillisecond: null,
            activationProbabilityPermilMultiply: null,
            limitCount: null,
            effectDurationMillisecond: null,
          },
        ],
      ]),
    ),
    specialSkills: Object.fromEntries(
      ['special-1'].map((id) => [
        id,
        [
          {
            liveSpecialSkillId: id,
            level: 1,
            liveActiveSkillEffectGroupId: 's-effect',
            additionalLiveSkillTriggerGroupId: null,
            additionalLiveActiveSkillEffectGroupId: null,
            effectDurationMillisecond: null,
          },
        ],
      ]),
    ),
    effects: Object.fromEntries(
      ['p-effect'].map((id) => [
        id,
        [
          {
            groupId: id,
            number: 1,
            type: 0,
            value: null,
            liveSkillEffectTargetId: null,
            resourceType: null,
            resourceIds: null,
            description: null,
          },
        ],
      ]),
    ),
    activeEffects: Object.fromEntries(
      ['a-effect', 's-effect'].map((id) => [
        id,
        [
          {
            groupId: id,
            number: 1,
            type: 0,
            value: null,
            scoreUpBasedOnParameterPermilMultiply: null,
            description: null,
          },
        ],
      ]),
    ),
    triggers: {},
    targets: [],
    catalog: {
      templates: {},
      labels: { character: {}, group: {}, attribute: {}, judgement: {} },
    },
    pendingDescriptions: [],
  }
}

function createGrowth(): CardGrowthData {
  return {
    levels: {
      'level-group': [
        {
          level: 80,
          parameterBaseValue: 10000,
          exp: null,
          liveDeckPowerPermyriadUp: null,
        },
        {
          level: 60,
          parameterBaseValue: 9000,
          exp: null,
          liveDeckPowerPermyriadUp: null,
        },
        {
          level: 90,
          parameterBaseValue: 12000,
          exp: null,
          liveDeckPowerPermyriadUp: null,
        },
      ],
    },
    levelLimits: {
      'limit-group': [
        { limitBreakCount: 0, levelLimit: 60, consumptions: null },
        { limitBreakCount: 4, levelLimit: 80, consumptions: null },
      ],
    },
    potentials: {
      'potential-group': [{ upgradeCount: 1, effectType: 4, value: 100 }],
    },
    potentialUpgradeItems: {},
  }
}

function captureError(callback: () => unknown): unknown {
  try {
    callback()
  } catch (error) {
    return error
  }
  throw new Error('Expected the callback to fail')
}

function createConnectData(): SkillTreeConnectData {
  return {
    effects: {
      'connect-1': [1, 2].map((level) => ({
        id: 'connect-1',
        level,
        connectEffectType: 1,
        skillTreeConnectEffectExtentGroupId: 'extent-1',
        effectPermilUp: level === 1 ? '1100' : '1600',
        additionalSkillTreeEffectId: null,
        targetSkillTreeEffectId: null,
        targetNodeType: null,
        targetNodeGrade: null,
        description: names,
      })),
    },
    extents: {
      'extent-1': [
        { x: -1, y: 1 },
        { x: 1, y: 0 },
      ],
    },
  }
}

describe('card list reader', () => {
  let originalDirectory: string
  let temporaryDirectory: string
  let closeSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    originalDirectory = process.cwd()
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'holodori-card-'))
    await mkdir(join(temporaryDirectory, '.data'))
    process.chdir(temporaryDirectory)
    closeSpy = vi.spyOn(DatabaseSync.prototype, 'close')
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    transformCardsMock.mockReset()
    transformCharactersMock.mockReset()
    transformCardGrowthMock.mockReset()
    transformLiveSkillDataMock.mockReset()
    transformCardSkillDataMock.mockReset()
    transformConnectDataMock.mockReset()
    transformLiveSkillDataMock.mockReturnValue(createLiveSkills())
    transformCardSkillDataMock.mockReturnValue(createCardSkills())
    transformConnectDataMock.mockReturnValue({ effects: {}, extents: {} })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    process.chdir(originalDirectory)
    await rm(temporaryDirectory, { recursive: true, force: true })
  })

  it('opens SQLite read-only and returns a compact list payload', () => {
    const databasePath = resolve(process.cwd(), '.data/master.sqlite')
    const setup = new DatabaseSync(databasePath)
    setup.close()
    closeSpy.mockClear()
    let writeError: unknown
    transformCardsMock.mockImplementation((database) => {
      try {
        database.run(sql`CREATE TABLE unexpected_write (id INTEGER)`)
      } catch (error) {
        writeError = error
      }
      return [
        createCard(),
        createCard({
          id: 'card-2',
          characterId: 'chr-2',
          assetId: 'card-asset-2',
        }),
      ]
    })
    transformCharactersMock.mockReturnValue([
      createCharacter({ assetId: 'character-asset-1' }),
      createCharacter({
        id: 'chr-2',
        assetId: null,
        defaultCostumeId: 'costume-2',
      }),
    ])
    transformCardGrowthMock.mockReturnValue(createGrowth())

    expect(readCardList()).toEqual({
      cards: [
        {
          id: 'card-1',
          characterId: 'chr-1',
          costumeId: 'costume-1',
          livePassiveSkillId: 'passive-1',
          liveActiveSkillId: 'active-1',
          liveSpecialSkillId: 'special-1',
          skillTreeConnectEffectId: null,
          characterOrder: 7,
          characterAssetId: 'character-asset-1',
          name: names,
          characterName: names,
          rarity: 5,
          attributeType: 2,
          assetId: 'asset-1',
          order: 3,
          level: 80,
          stats: { performance: 4400, technique: 3300, sense: 3300 },
          total: 11000,
          specializations: ['performance'],
        },
        {
          id: 'card-2',
          characterId: 'chr-2',
          costumeId: 'costume-2',
          livePassiveSkillId: 'passive-1',
          liveActiveSkillId: 'active-1',
          liveSpecialSkillId: 'special-1',
          skillTreeConnectEffectId: null,
          characterOrder: 7,
          characterAssetId: null,
          name: names,
          characterName: names,
          rarity: 5,
          attributeType: 2,
          assetId: 'card-asset-2',
          order: 3,
          level: 80,
          stats: { performance: 4400, technique: 3300, sense: 3300 },
          total: 11000,
          specializations: ['performance'],
        },
      ],
      costumes: {
        'costume-1': { name: names, leaderSkillId: null },
        'costume-2': { name: names, leaderSkillId: null },
      },
      connectEffects: {},
      connectExtents: {},
      skills: {
        leaderSkills: {},
        passiveSkills: createCardSkills().passiveSkills,
        activeSkills: createCardSkills().activeSkills,
        specialSkills: createCardSkills().specialSkills,
        effects: { 'p-effect': [{ type: 0, description: null }] },
        activeEffects: {
          'a-effect': [{ type: 0, description: null }],
          's-effect': [{ type: 0, description: null }],
        },
        triggers: {},
        targets: [],
        catalog: {
          templates: {},
          labels: {
            character: {},
            group: {},
            attribute: {},
            judgement: {},
            probability: {},
          },
        },
      },
    })
    expect(writeError).toMatchObject({
      cause: { message: 'attempt to write a readonly database' },
    })
    expect(transformCardsMock).toHaveBeenCalledOnce()
    expect(transformCharactersMock).toHaveBeenCalledOnce()
    expect(transformCardGrowthMock).toHaveBeenCalledOnce()
    expect(transformLiveSkillDataMock).toHaveBeenCalledOnce()
    expect(transformCardSkillDataMock).toHaveBeenCalledOnce()
    expect(transformConnectDataMock).toHaveBeenCalledOnce()
    expect(closeSpy).toHaveBeenCalledOnce()
  })

  it('allows an empty card table without loading related data', () => {
    const setup = new DatabaseSync(
      resolve(process.cwd(), '.data/master.sqlite'),
    )
    setup.close()
    closeSpy.mockClear()
    transformCardsMock.mockReturnValue([])

    expect(readCardList()).toMatchObject({
      cards: [],
      costumes: {},
      skills: { leaderSkills: {}, effects: {}, triggers: {}, targets: [] },
    })
    expect(transformCharactersMock).not.toHaveBeenCalled()
    expect(transformCardGrowthMock).not.toHaveBeenCalled()
    expect(transformLiveSkillDataMock).not.toHaveBeenCalled()
    expect(transformCardSkillDataMock).not.toHaveBeenCalled()
    expect(transformConnectDataMock).not.toHaveBeenCalled()
    expect(closeSpy).toHaveBeenCalledOnce()
  })

  it('projects reachable Connect levels and shares their extent across cards', () => {
    const setup = new DatabaseSync(
      resolve(process.cwd(), '.data/master.sqlite'),
    )
    setup.close()
    closeSpy.mockClear()
    transformCardsMock.mockReturnValue([
      createCard({ skillTreeConnectEffectId: 'connect-1' }),
      createCard({ id: 'card-2', skillTreeConnectEffectId: 'connect-1' }),
      createCard({ id: 'card-3' }),
    ])
    transformCharactersMock.mockReturnValue([createCharacter()])
    transformCardGrowthMock.mockReturnValue(createGrowth())
    const data = createConnectData()
    data.effects.unused = data.effects['connect-1']!.map((level) => ({
      ...level,
      id: 'unused',
      skillTreeConnectEffectExtentGroupId: 'unused-extent',
    }))
    data.extents['unused-extent'] = [{ x: 3, y: 0 }]
    transformConnectDataMock.mockReturnValue(data)

    const payload = readCardList()
    expect(payload.cards.map((card) => card.skillTreeConnectEffectId)).toEqual([
      'connect-1',
      'connect-1',
      null,
    ])
    expect(payload.connectEffects).toEqual({
      'connect-1': [1, 2].map((level) => ({
        level,
        extentGroupId: 'extent-1',
        description: names,
      })),
    })
    expect(payload.connectExtents).toEqual({
      'extent-1': data.extents['extent-1'],
    })
    expect(closeSpy).toHaveBeenCalledOnce()
  })

  it.each(['effect', 'extent'] as const)(
    'preserves the source error for a missing Connect %s',
    (missing) => {
      const setup = new DatabaseSync(
        resolve(process.cwd(), '.data/master.sqlite'),
      )
      setup.close()
      closeSpy.mockClear()
      transformCardsMock.mockReturnValue([
        createCard({ skillTreeConnectEffectId: 'connect-1' }),
      ])
      transformCharactersMock.mockReturnValue([createCharacter()])
      transformCardGrowthMock.mockReturnValue(createGrowth())
      const data = createConnectData()
      if (missing === 'effect') data.effects = {}
      else data.extents = {}
      transformConnectDataMock.mockReturnValue(data)

      const error = captureError(readCardList)
      expect(error).toMatchObject({
        message: expect.stringContaining('Unable to read card data'),
        cause: {
          message: expect.stringContaining(
            missing === 'effect'
              ? 'Card card-1 references missing SkillTreeConnectEffect connect-1'
              : 'SkillTreeConnectEffect connect-1 level 1 references missing SkillTreeConnectEffectExtent extent-1',
          ),
        },
      })
      expect(closeSpy).toHaveBeenCalledOnce()
    },
  )

  it('logs each locale failure for an unresolved selected leader skill', () => {
    const setup = new DatabaseSync(
      resolve(process.cwd(), '.data/master.sqlite'),
    )
    setup.close()
    closeSpy.mockClear()
    transformCardsMock.mockReturnValue([createCard()])
    transformCharactersMock.mockReturnValue([createCharacter()])
    transformCardGrowthMock.mockReturnValue(createGrowth())
    transformLiveSkillDataMock.mockReturnValue({
      ...createLiveSkills(),
      costumes: [
        {
          id: 'costume-1',
          characterId: 'chr-1',
          name: names,
          liveLeaderSkillId: 'skill-1',
        },
      ],
      leaderSkills: [
        {
          id: 'skill-1',
          liveSkillTriggerGroupId: null,
          livePassiveSkillEffectGroupId: 'effect-group',
          additionalLiveSkillTriggerGroupId: null,
          additionalLivePassiveSkillEffectGroupId: null,
        },
      ],
      effects: {
        'effect-group': [
          {
            groupId: 'effect-group',
            number: 1,
            type: 1,
            value: null,
            liveSkillEffectTargetId: null,
            resourceType: null,
            resourceIds: null,
            description: null,
          },
        ],
      },
    })
    transformCardSkillDataMock.mockImplementation(() => ({
      ...createCardSkills(),
      effects: {
        ...createCardSkills().effects,
        'effect-group': [
          {
            groupId: 'effect-group',
            number: 1,
            type: 1,
            value: null,
            liveSkillEffectTargetId: null,
            resourceType: null,
            resourceIds: null,
            description: null,
          },
        ],
      },
    }))
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const payload = readCardList()

    expect(payload.cards[0]?.costumeId).toBe('costume-1')
    expect(payload.skills.effects['effect-group']).toEqual([
      { type: 1, description: null },
    ])
    expect(warning).toHaveBeenCalledTimes(6)
    expect(warning).toHaveBeenCalledWith(
      '[LiveLeaderSkill skill-1 (jpn)] 主要條件或效果描述無法解析',
    )
    expect(warning).toHaveBeenCalledWith(
      '[LiveLeaderSkill skill-1 (eng)] 主要條件或效果描述無法解析',
    )
    expect(closeSpy).toHaveBeenCalledOnce()
  })

  it('reports a missing character relation and closes the database', () => {
    const setup = new DatabaseSync(
      resolve(process.cwd(), '.data/master.sqlite'),
    )
    setup.close()
    closeSpy.mockClear()
    transformCardsMock.mockReturnValue([createCard()])
    transformCharactersMock.mockReturnValue([])
    transformCardGrowthMock.mockReturnValue(createGrowth())

    expect(captureError(readCardList)).toMatchObject({
      message: expect.stringContaining('Unable to read card data'),
      cause: {
        message: 'Card card-1 references missing Character chr-1',
      },
    })
    expect(closeSpy).toHaveBeenCalledOnce()
  })

  it('reports a missing level limit relation', () => {
    const setup = new DatabaseSync(
      resolve(process.cwd(), '.data/master.sqlite'),
    )
    setup.close()
    closeSpy.mockClear()
    transformCardsMock.mockReturnValue([createCard()])
    transformCharactersMock.mockReturnValue([createCharacter()])
    transformCardGrowthMock.mockReturnValue({
      ...createGrowth(),
      levelLimits: {},
    })

    expect(captureError(readCardList)).toMatchObject({
      cause: {
        message:
          'Card card-1 references missing CardLevelLimit group limit-group',
      },
    })
    expect(closeSpy).toHaveBeenCalledOnce()
  })

  it('reports when the level limit has no matching card level row', () => {
    const setup = new DatabaseSync(
      resolve(process.cwd(), '.data/master.sqlite'),
    )
    setup.close()
    closeSpy.mockClear()
    transformCardsMock.mockReturnValue([createCard()])
    transformCharactersMock.mockReturnValue([createCharacter()])
    transformCardGrowthMock.mockReturnValue({
      ...createGrowth(),
      levels: {},
    })

    expect(captureError(readCardList)).toMatchObject({
      cause: {
        message:
          'Card card-1 has no CardLevel row for group level-group at level 80',
      },
    })
    expect(closeSpy).toHaveBeenCalledOnce()
  })

  it('reports a missing potential relation', () => {
    const setup = new DatabaseSync(
      resolve(process.cwd(), '.data/master.sqlite'),
    )
    setup.close()
    closeSpy.mockClear()
    transformCardsMock.mockReturnValue([createCard()])
    transformCharactersMock.mockReturnValue([createCharacter()])
    transformCardGrowthMock.mockReturnValue({
      ...createGrowth(),
      potentials: {},
    })

    expect(captureError(readCardList)).toMatchObject({
      cause: {
        message:
          'Card card-1 references missing CardPotential group potential-group',
      },
    })
    expect(closeSpy).toHaveBeenCalledOnce()
  })

  it('wraps converter failures with the source path and cause, then closes', () => {
    const setup = new DatabaseSync(
      resolve(process.cwd(), '.data/master.sqlite'),
    )
    setup.close()
    closeSpy.mockClear()
    transformCardsMock.mockImplementation(() => {
      throw new Error('Invalid card data')
    })

    expect(captureError(readCardList)).toMatchObject({
      message: `Unable to read card data from ${resolve(process.cwd(), '.data/master.sqlite')}`,
      cause: { message: 'Invalid card data' },
    })
    expect(closeSpy).toHaveBeenCalledOnce()
  })
})
