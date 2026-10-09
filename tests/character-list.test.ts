import { describe, expect, it } from 'vitest'
import {
  getCharacterIconUrl,
  getCharacterSections,
} from '../shared/game-data/character-list'

describe('character list', () => {
  it('groups all characters once by production while retaining source order', () => {
    const characters = [
      { id: 'chr-04004', productionId: 'prd-en', order: 146 },
      { id: 'chr-00015', productionId: 'prd-jp', order: 15 },
      {
        id: 'chr-00006',
        productionId: 'prd-jp',
        order: 6,
        regularGroupIds: ['grp-gen_1', 'grp-gamers'],
      },
      { id: 'chr-03001', productionId: 'prd-id', order: 100 },
      { id: 'chr-06001', productionId: 'prd-dev_is', order: 180 },
    ]
    const originalOrder = characters.map((character) => character.id)
    const sections = getCharacterSections(characters)
    expect(sections.map((section) => section.name)).toEqual([
      'hololive',
      'hololive ID',
      'hololive EN',
      'DEV_IS',
    ])
    expect(sections[0]?.characters.map((character) => character.id)).toEqual([
      'chr-00006',
      'chr-00015',
    ])
    expect(sections.flatMap((section) => section.characters)).toHaveLength(5)
    expect(characters.map((character) => character.id)).toEqual(originalOrder)
  })

  it('retains unknown productions in the final section and omits empty groups', () => {
    const characters = [
      { id: 'unknown', productionId: 'prd-new', order: 2 },
      { id: 'no-production', productionId: null, order: 1 },
    ]
    expect(getCharacterSections(characters)).toEqual([
      {
        id: 'other',
        name: null,
        characters: [characters[1], characters[0]],
      },
    ])
    expect(getCharacterSections([])).toEqual([])
  })

  it('uses the normal icon CDN path and supports an absent asset ID', () => {
    expect(getCharacterIconUrl('00015')).toBe(
      'https://assets.holodori.net/cdn/img_chr_icon_normal_00015/Texture2D/img_chr_icon_normal_00015.png',
    )
    expect(getCharacterIconUrl(null)).toBeNull()
  })
})
