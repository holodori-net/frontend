import { DatabaseSync } from 'node:sqlite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import type { CharacterData } from '#shared/game-data/characters'
import type { LocalizedText } from '#shared/game-data/localized-text'
import { readCharacterList } from '../../server/data/character-list.ts'
import { transformCharacters } from '../../server/data/converters/characters.ts'

vi.mock('../../server/data/converters/characters.ts', () => ({
  transformCharacters: vi.fn(),
}))

const transformCharactersMock = vi.mocked(transformCharacters)

function localizedText(prefix: string): LocalizedText {
  return {
    jpn: `${prefix} 日本語`,
    eng: `${prefix} English`,
    ind: `${prefix} Indonesia`,
    kor: `${prefix} 한국어`,
    cht: `${prefix} 繁體中文`,
    chs: `${prefix} 简体中文`,
  }
}

function createCharacter(
  overrides: Partial<CharacterData> = {},
): CharacterData {
  return {
    id: 'chr-1',
    name: localizedText('Name'),
    shortName: localizedText('Short'),
    productionId: 'prd-jp',
    birthday: { month: 1, day: 2 },
    debutDate: { year: 2020, month: 3, day: 4 },
    fanName: null,
    description: null,
    comment: null,
    youtubeUrl: null,
    xUrl: null,
    personalityType: null,
    sdPersonalityType: null,
    assetId: 'asset-1',
    isPlayable: true,
    regularGroupIds: [],
    regularGroupName: null,
    order: 7,
    dominantHandType: 0,
    isTutorial: null,
    defaultCostumeId: '',
    defaultSdCostumeId: '',
    bgmAssetId: null,
    color1: 'AABBCC',
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

describe('character list reader', () => {
  let originalDirectory: string
  let temporaryDirectory: string
  let closeSpy: ReturnType<typeof vi.spyOn>
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    originalDirectory = process.cwd()
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'holodori-character-'))
    await mkdir(join(temporaryDirectory, '.data'))
    process.chdir(temporaryDirectory)
    closeSpy = vi.spyOn(DatabaseSync.prototype, 'close')
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    transformCharactersMock.mockReset()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    process.chdir(originalDirectory)
    await rm(temporaryDirectory, { recursive: true, force: true })
  })

  it('opens the master database read-only and returns only list fields', () => {
    const databasePath = resolve(process.cwd(), '.data/master.sqlite')
    const setup = new DatabaseSync(databasePath)
    setup.close()
    closeSpy.mockClear()

    let writeError: unknown
    const character = createCharacter()
    transformCharactersMock.mockImplementation((database) => {
      try {
        database.run(sql`CREATE TABLE unexpected_write (id INTEGER)`)
      } catch (error) {
        writeError = error
      }
      return [character]
    })

    expect(readCharacterList()).toEqual([
      {
        id: 'chr-1',
        name: localizedText('Name'),
        productionId: 'prd-jp',
        assetId: 'asset-1',
        isPlayable: true,
        order: 7,
        color1: 'AABBCC',
      },
    ])
    expect(writeError).toBeInstanceOf(Error)
    expect(writeError).toMatchObject({
      cause: { message: 'attempt to write a readonly database' },
    })
    expect(transformCharactersMock).toHaveBeenCalledOnce()
    expect(closeSpy).toHaveBeenCalledOnce()
    expect(consoleInfoSpy).toHaveBeenCalledWith('Loaded 1 characters')
  })

  it('reports the path and cause when the database is missing', () => {
    const databasePath = resolve(process.cwd(), '.data/master.sqlite')

    try {
      readCharacterList()
      throw new Error('Expected the database open to fail')
    } catch (error) {
      expect(error).toMatchObject({
        message: `Unable to read character data from ${databasePath}`,
        cause: { message: 'unable to open database file' },
      })
    }
    expect(closeSpy).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `Unable to read character data from ${databasePath}`,
        cause: expect.objectContaining({
          message: 'unable to open database file',
        }),
      }),
    )
  })

  it('reports a query failure for a corrupted database and closes it', async () => {
    const databasePath = resolve(process.cwd(), '.data/master.sqlite')
    await writeFile(databasePath, 'not a sqlite database')
    transformCharactersMock.mockImplementation((database) => {
      database.all(sql`SELECT name FROM sqlite_master`)
      return []
    })

    try {
      readCharacterList()
      throw new Error('Expected a query against the corrupted database to fail')
    } catch (error) {
      expect(error).toMatchObject({
        message: `Unable to read character data from ${databasePath}`,
        cause: expect.objectContaining({
          query: 'SELECT name FROM sqlite_master',
          cause: expect.objectContaining({ message: 'file is not a database' }),
        }),
      })
    }
    expect(transformCharactersMock).toHaveBeenCalledOnce()
    expect(closeSpy).toHaveBeenCalledOnce()
  })

  it('returns empty lists and retains null values and non-playable characters', () => {
    const databasePath = resolve(process.cwd(), '.data/master.sqlite')
    const setup = new DatabaseSync(databasePath)
    setup.close()
    closeSpy.mockClear()
    const nonPlayable = createCharacter({
      id: 'chr-non-playable',
      productionId: null,
      assetId: null,
      isPlayable: false,
      color1: null,
    })
    transformCharactersMock
      .mockReturnValueOnce([])
      .mockReturnValueOnce([nonPlayable])

    expect(readCharacterList()).toEqual([])
    expect(readCharacterList()).toEqual([
      {
        id: 'chr-non-playable',
        name: localizedText('Name'),
        productionId: null,
        assetId: null,
        isPlayable: false,
        order: 7,
        color1: null,
      },
    ])
    expect(closeSpy).toHaveBeenCalledTimes(2)
  })

  it('closes the database when character transformation fails', () => {
    const setup = new DatabaseSync(
      resolve(process.cwd(), '.data/master.sqlite'),
    )
    setup.close()
    closeSpy.mockClear()
    transformCharactersMock.mockImplementation(() => {
      throw new Error('Invalid character data')
    })

    let error: unknown
    try {
      readCharacterList()
    } catch (caughtError) {
      error = caughtError
    }
    expect(error).toMatchObject({
      message: /Unable to read character data/,
      cause: { message: 'Invalid character data' },
    })
    expect(closeSpy).toHaveBeenCalledOnce()
  })
})
