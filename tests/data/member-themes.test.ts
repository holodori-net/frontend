import { DatabaseSync } from 'node:sqlite'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gameLocales } from '../../shared/language.ts'
import {
  defaultThemeId,
  getMemberThemeAssets,
  resolveMemberTheme,
} from '../../shared/theme.ts'
import type { CharacterData } from '../../shared/game-data/characters.ts'
import {
  projectMemberThemes,
  readMemberThemes,
} from '../../server/data/member-themes.ts'
import { transformCharacters } from '../../server/data/converters/characters.ts'

vi.mock('../../server/data/converters/characters.ts', () => ({
  transformCharacters: vi.fn(),
}))

const transformMock = vi.mocked(transformCharacters)
const character = {
  id: defaultThemeId,
  name: {
    jpn: 'さくらみこ',
    eng: 'Sakura Miko',
    ind: 'Sakura Miko',
    kor: '사쿠라 미코',
    cht: '櫻巫女',
    chs: '樱巫女',
  },
  assetId: '00015',
  order: 104,
  color1: 'FF909E',
  color2: 'DD3654',
  color3: 'FFD64F',
  color4: 'FF5B70',
  isPlayable: false,
}

describe('member theme projection', () => {
  it('keeps six-language names, source order, official colors, and padded assets', () => {
    const [theme] = projectMemberThemes([character])
    expect(theme).toEqual({
      id: defaultThemeId,
      name: character.name,
      order: 104,
      color1: '#FF909E',
      color2: '#DD3654',
      color3: '#FFD64F',
      color4: '#FF5B70',
      assets: {
        avatar:
          'https://assets.holodori.net/cdn/img_chr_icon_normal_00015/Texture2D/img_chr_icon_normal_00015.png',
        motifMain:
          'https://assets.holodori.net/cdn/img_chr_motif_icon_default_main_00015/Texture2D/img_chr_motif_icon_default_main_00015.png',
        motifLight:
          'https://assets.holodori.net/cdn/img_chr_motif_icon_light_main_00015/Texture2D/img_chr_motif_icon_light_main_00015.png',
      },
    })
    expect(Object.keys(theme!.name).sort()).toEqual([...gameLocales].sort())
    expect(theme).not.toHaveProperty('isPlayable')
  })

  it('includes unplayable members, omits missing main colors, and falls back optional colors', () => {
    const themes = projectMemberThemes([
      { ...character, color1: null },
      {
        ...character,
        id: 'chr-no-assets',
        assetId: null,
        color1: 'aabbcc',
        color2: null,
        color3: '',
        color4: null,
      },
    ])
    expect(themes).toHaveLength(1)
    expect(themes[0]).toMatchObject({
      id: 'chr-no-assets',
      color1: '#AABBCC',
      color2: '#AABBCC',
      color3: '#AABBCC',
      color4: '#AABBCC',
      assets: { avatar: null, motifMain: null, motifLight: null },
    })
    expect(getMemberThemeAssets('')).toEqual({
      avatar: null,
      motifMain: null,
      motifLight: null,
    })
  })

  it('sorts by source order and ID', () => {
    const themes = projectMemberThemes([
      { ...character, id: 'chr-z', order: 2 },
      { ...character, id: 'chr-b', order: 1 },
      { ...character, id: 'chr-a', order: 1 },
    ])
    expect(themes.map(({ id }) => id)).toEqual(['chr-a', 'chr-b', 'chr-z'])
  })

  it('uses Miko for absent or invalid preferences and honors a valid character ID', () => {
    const themes = projectMemberThemes([
      character,
      { ...character, id: 'chr-00001' },
    ])
    for (const id of [undefined, null, '', 'unknown']) {
      expect(resolveMemberTheme(themes, id).id).toBe(defaultThemeId)
    }
    expect(resolveMemberTheme(themes, 'chr-00001').id).toBe('chr-00001')
    expect(() => resolveMemberTheme([], null)).toThrow(
      'Missing default member theme: chr-00015',
    )
  })

  it('reports malformed source colors with the character and field', () => {
    expect(() =>
      projectMemberThemes([{ ...character, color4: 'invalid' }]),
    ).toThrow('Invalid color in Character.color4 for chr-00015: invalid')
  })
})

describe('member theme reader', () => {
  let previousDirectory: string
  let directory: string

  beforeEach(async () => {
    previousDirectory = process.cwd()
    directory = await mkdtemp(join(tmpdir(), 'holodori-themes-'))
    await mkdir(join(directory, '.data'))
    process.chdir(directory)
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    transformMock.mockReset()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    process.chdir(previousDirectory)
    await rm(directory, { recursive: true, force: true })
  })

  it('reads without writes and closes the connection after projection', () => {
    const setup = new DatabaseSync(resolve(directory, '.data/master.sqlite'))
    setup.close()
    const close = vi.spyOn(DatabaseSync.prototype, 'close')
    transformMock.mockImplementation((database) => {
      expect(() =>
        database.run(sql`CREATE TABLE unexpected_write (id INTEGER)`),
      ).toThrow()
      return [character as CharacterData]
    })
    expect(readMemberThemes()).toEqual(projectMemberThemes([character]))
    expect(close).toHaveBeenCalledOnce()
    expect(console.info).toHaveBeenCalledWith('Loaded 1 member themes')
  })

  it('retains missing database errors with the source path', () => {
    let failure: unknown
    try {
      readMemberThemes()
    } catch (error) {
      failure = error
    }
    expect(failure).toMatchObject({
      message: `Unable to read member themes from ${resolve(directory, '.data/master.sqlite')}`,
      cause: { message: 'unable to open database file' },
    })
  })

  it('retains conversion errors and closes the connection', () => {
    const setup = new DatabaseSync(resolve(directory, '.data/master.sqlite'))
    setup.close()
    const close = vi.spyOn(DatabaseSync.prototype, 'close')
    const cause = new Error('Missing jpn translation in LangCharacter')
    transformMock.mockImplementation(() => {
      throw cause
    })
    let failure: unknown
    try {
      readMemberThemes()
    } catch (error) {
      failure = error
    }
    expect(failure).toMatchObject({ cause })
    expect(close).toHaveBeenCalledOnce()
  })
})
