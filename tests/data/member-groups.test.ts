import { beforeEach, describe, expect, it, vi } from 'vitest'
import { gameLocales } from '../../shared/language.ts'
import type { CharacterGroupData } from '../../shared/game-data/character-groups.ts'
import { readMemberGroups } from '../../server/data/member-groups.ts'
import { transformCharacterGroups } from '../../server/data/converters/character-groups.ts'

vi.mock('../../server/data/converters/character-groups.ts', () => ({
  transformCharacterGroups: vi.fn(),
}))
vi.mock('../../server/data/database.ts', () => ({
  withGameDatabase: (operation: (database: unknown) => unknown) =>
    operation(null),
}))

const names = Object.fromEntries(
  gameLocales.map((locale) => [locale, `Group ${locale}`]),
) as CharacterGroupData['name']
const group: CharacterGroupData = {
  id: 'gen-1',
  name: names,
  description: names,
  isRegular: true,
  characterIds: ['shared', 'member-1'],
  order: 1,
  assetId: 'group-1',
  color1: 'FFFFFF',
  color2: '000000',
}

beforeEach(() => vi.resetAllMocks())

describe('member group reader', () => {
  it('projects regular groups with source names, order and overlapping members', () => {
    vi.mocked(transformCharacterGroups).mockReturnValue([
      group,
      { ...group, id: 'aggregate', isRegular: false, order: 2 },
      { ...group, id: 'gamers', characterIds: ['shared'], order: 3 },
    ])

    expect(readMemberGroups()).toEqual([
      {
        id: 'gen-1',
        name: names,
        characterIds: ['shared', 'member-1'],
        order: 1,
      },
      { id: 'gamers', name: names, characterIds: ['shared'], order: 3 },
    ])
  })

  it('preserves source conversion errors', () => {
    const error = new Error('Missing LangCharacterGrouping translation')
    vi.mocked(transformCharacterGroups).mockImplementation(() => {
      throw error
    })
    expect(() => readMemberGroups()).toThrow(error)
  })
})
