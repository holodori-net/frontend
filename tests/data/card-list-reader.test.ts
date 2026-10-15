import { DatabaseSync } from 'node:sqlite'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import type { CardData } from '../../shared/game-data/cards.ts'
import type { CardGrowthData } from '../../shared/game-data/card-growth.ts'
import type { CharacterData } from '../../shared/game-data/characters.ts'
import type { LocalizedNames } from '../../shared/game-data/localized-text.ts'
import { readCardList } from '../../server/data/card-list.ts'
import { transformCardGrowth } from '../../server/data/converters/card-growth.ts'
import { transformCards } from '../../server/data/converters/cards.ts'
import { transformCharacters } from '../../server/data/converters/characters.ts'

vi.mock('../../server/data/converters/cards.ts', () => ({
  transformCards: vi.fn(),
}))
vi.mock('../../server/data/converters/characters.ts', () => ({
  transformCharacters: vi.fn(),
}))
vi.mock('../../server/data/converters/card-growth.ts', () => ({
  transformCardGrowth: vi.fn(),
}))

const transformCardsMock = vi.mocked(transformCards)
const transformCharactersMock = vi.mocked(transformCharacters)
const transformCardGrowthMock = vi.mocked(transformCardGrowth)

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
    defaultCostumeId: '',
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
      createCharacter({ id: 'chr-2', assetId: null }),
    ])
    transformCardGrowthMock.mockReturnValue(createGrowth())

    expect(readCardList()).toEqual([
      {
        id: 'card-1',
        characterId: 'chr-1',
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
    ])
    expect(writeError).toMatchObject({
      cause: { message: 'attempt to write a readonly database' },
    })
    expect(transformCardsMock).toHaveBeenCalledOnce()
    expect(transformCharactersMock).toHaveBeenCalledOnce()
    expect(transformCardGrowthMock).toHaveBeenCalledOnce()
    expect(closeSpy).toHaveBeenCalledOnce()
  })

  it('allows an empty card table without loading related data', () => {
    const setup = new DatabaseSync(
      resolve(process.cwd(), '.data/master.sqlite'),
    )
    setup.close()
    closeSpy.mockClear()
    transformCardsMock.mockReturnValue([])

    expect(readCardList()).toEqual([])
    expect(transformCharactersMock).not.toHaveBeenCalled()
    expect(transformCardGrowthMock).not.toHaveBeenCalled()
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
