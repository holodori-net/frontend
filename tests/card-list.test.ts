import { describe, expect, it } from 'vitest'
import type { GameLocale } from '../shared/language.ts'
import type { CardListItemData } from '../shared/game-data/card-list-data.ts'
import {
  createCardListConditions,
  filterAndSortCards,
  getCardFilterOptions,
  getCardImageUrl,
  parseCardListQuery,
  toCardListQuery,
  type CardListConditions,
  type CardListSort,
} from '../shared/game-data/card-list.ts'

function card(
  id: string,
  values: Partial<CardListItemData> &
    Pick<CardListItemData, 'characterId' | 'characterOrder' | 'order'>,
): CardListItemData {
  const name: Record<GameLocale, string> = {
    jpn: `カード${id}`,
    eng: `Card ${id}`,
    ind: `Kartu ${id}`,
    kor: `카드 ${id}`,
    cht: `卡片${id}`,
    chs: `卡片${id}`,
  }
  const characterName: Record<GameLocale, string> = {
    jpn: values.characterId === 'c-a' ? 'わたし' : 'あかり',
    eng: values.characterId === 'c-a' ? 'Zulu' : 'Alpha',
    ind: values.characterId === 'c-a' ? 'Aoi' : 'Shiro',
    kor: values.characterId === 'c-a' ? '아오이' : '시로',
    cht: values.characterId === 'c-a' ? '青' : '白',
    chs: values.characterId === 'c-a' ? '青' : '白',
  }
  return {
    id,
    characterId: values.characterId,
    costumeId: values.costumeId ?? null,
    livePassiveSkillId: values.livePassiveSkillId ?? `passive-${id}`,
    liveActiveSkillId: values.liveActiveSkillId ?? `active-${id}`,
    liveSpecialSkillId: values.liveSpecialSkillId ?? `special-${id}`,
    skillTreeConnectEffectId: values.skillTreeConnectEffectId ?? null,
    characterOrder: values.characterOrder,
    characterAssetId: values.characterAssetId ?? null,
    name: values.name ?? name,
    characterName: values.characterName ?? characterName,
    rarity: values.rarity ?? 3,
    attributeType: values.attributeType ?? 1,
    assetId: values.assetId ?? id,
    order: values.order,
    stats: values.stats ?? { performance: 100, technique: 100, sense: 100 },
    total: values.total ?? 300,
    level: values.level ?? 1,
    specializations: values.specializations ?? [],
  }
}

const cards = [
  card('c-02', {
    characterId: 'c-b',
    characterOrder: 2,
    order: 2,
    rarity: 4,
    attributeType: 2,
    stats: { performance: 250, technique: 100, sense: 50 },
    total: 400,
    specializations: ['performance'],
    name: {
      jpn: '桜の歌',
      eng: 'Sakura Song',
      ind: 'Lagu Sakura',
      kor: '벚꽃 노래',
      cht: '櫻花之歌',
      chs: '樱花之歌',
    },
  }),
  card('c-01', {
    characterId: 'c-a',
    characterOrder: 1,
    order: 4,
    rarity: 5,
    attributeType: 1,
    stats: { performance: 100, technique: 200, sense: 100 },
    total: 400,
    specializations: ['technique'],
  }),
  card('c-03', {
    characterId: 'c-a',
    characterOrder: 1,
    order: 4,
    rarity: 3,
    attributeType: 3,
    stats: { performance: 100, technique: 100, sense: 200 },
    total: 400,
    specializations: ['sense', 'performance'],
  }),
]

describe('card list', () => {
  it('provides defaults and derives unique filter options from the full list', () => {
    const options = getCardFilterOptions(cards)
    expect(createCardListConditions(options)).toEqual({
      q: '',
      character: [],
      skill: [],
      rarity: [3, 4, 5],
      attribute: [1, 2, 3],
      specialization: ['performance', 'technique', 'sense'],
      sort: 'order',
      direction: 'desc',
    })
    expect(getCardFilterOptions(cards)).toEqual({
      character: ['c-a', 'c-b'],
      rarity: [3, 4, 5],
      attribute: [1, 2, 3],
      specialization: ['performance', 'technique', 'sense'],
    })
  })

  it('orders character filter options by source order and uses ID for ties', () => {
    const unorderedCards = [
      card('card-a', { characterId: 'c-a', characterOrder: 3, order: 1 }),
      card('card-z-2', { characterId: 'c-z', characterOrder: 1, order: 2 }),
      card('card-m', { characterId: 'c-m', characterOrder: 2, order: 3 }),
      card('card-b', { characterId: 'c-b', characterOrder: 1, order: 4 }),
      card('card-z-1', { characterId: 'c-z', characterOrder: 1, order: 5 }),
    ]

    expect(getCardFilterOptions(unorderedCards).character).toEqual([
      'c-b',
      'c-z',
      'c-m',
      'c-a',
    ])
  })

  it('searches all localized card and character names with trim and case folding', () => {
    const conditions = {
      ...createCardListConditions(getCardFilterOptions(cards)),
      q: '  SAKURA ',
    }
    expect(
      filterAndSortCards(cards, conditions).map((item) => item.id),
    ).toEqual(['c-02'])
    const localized = { ...conditions, q: '櫻花' }
    expect(filterAndSortCards(cards, localized).map((item) => item.id)).toEqual(
      ['c-02'],
    )
    const characterName = { ...conditions, q: ' ZULU ' }
    expect(
      filterAndSortCards(cards, characterName).map((item) => item.id),
    ).toEqual(['c-01', 'c-03'])
  })

  it('combines filter groups with AND and values within each group with OR', () => {
    const conditions: CardListConditions = {
      ...createCardListConditions(getCardFilterOptions(cards)),
      character: ['c-a', 'c-b'],
      rarity: [3, 5],
      attribute: [1, 3],
      specialization: ['performance', 'sense'],
    }
    expect(
      filterAndSortCards(cards, conditions).map((item) => item.id),
    ).toEqual(['c-03'])
  })

  it('returns no results when any checkbox group has no selected values', () => {
    const defaults = createCardListConditions(getCardFilterOptions(cards))
    for (const group of ['rarity', 'attribute', 'specialization'] as const) {
      expect(
        filterAndSortCards(cards, { ...defaults, [group]: [] }),
        group,
      ).toEqual([])
    }

    expect(
      filterAndSortCards(cards, { ...defaults, character: [] }),
    ).toHaveLength(cards.length)
  })

  it('matches any selected skill, resolves source aliases, and combines other filters', () => {
    const cardSkills = {
      'c-01': ['passive:shared'],
      'c-02': ['active:second'],
      'c-03': ['leader:third'],
    }
    const aliases = { 'passive:alias': 'passive:shared' }
    const defaults = createCardListConditions(getCardFilterOptions(cards))
    const selected = {
      ...defaults,
      skill: ['passive:alias', 'leader:third'],
    }
    const ids = (conditions: CardListConditions) =>
      filterAndSortCards(cards, conditions, cardSkills, aliases).map(
        ({ id }) => id,
      )

    expect(ids(selected)).toEqual(['c-01', 'c-03'])
    expect(ids({ ...selected, rarity: [3] })).toEqual(['c-03'])
    expect(ids({ ...selected, character: ['c-b'] })).toEqual([])
    expect(ids({ ...defaults, skill: ['missing'] })).toEqual([])
    expect(ids(defaults)).toHaveLength(cards.length)
  })

  it('round-trips logical skill selections and omits empty or invalid selections', () => {
    const options = getCardFilterOptions(cards, [
      'special:b',
      'active:a',
      'active:a',
    ])
    expect(options.skill).toEqual(['active:a', 'special:b'])
    const parsed = parseCardListQuery(
      { skill: ['special:b', 'unknown', 'active:a', 'special:b'] },
      options,
    )
    expect(parsed.skill).toEqual(['special:b', 'active:a'])
    expect(toCardListQuery(parsed, options)).toEqual({
      skill: ['active:a', 'special:b'],
    })
    expect(parseCardListQuery({ skill: 'unknown' }, options).skill).toEqual([])
    expect(
      toCardListQuery(createCardListConditions(options), options, {
        skill: 'old',
        custom: 'keep',
      }),
    ).toEqual({ custom: 'keep' })
  })

  it('sorts every supported key in either direction and resolves ties consistently', () => {
    const expectedAscending: Record<CardListSort, string[]> = {
      order: ['c-02', 'c-01', 'c-03'],
      rarity: ['c-03', 'c-02', 'c-01'],
      character: ['c-01', 'c-03', 'c-02'],
      performance: ['c-01', 'c-03', 'c-02'],
      technique: ['c-03', 'c-02', 'c-01'],
      sense: ['c-02', 'c-01', 'c-03'],
      total: ['c-01', 'c-03', 'c-02'],
    }
    const expectedDescending: Record<CardListSort, string[]> = {
      order: ['c-01', 'c-03', 'c-02'],
      rarity: ['c-01', 'c-02', 'c-03'],
      character: ['c-02', 'c-01', 'c-03'],
      performance: ['c-02', 'c-01', 'c-03'],
      technique: ['c-01', 'c-03', 'c-02'],
      sense: ['c-03', 'c-01', 'c-02'],
      total: ['c-01', 'c-03', 'c-02'],
    }
    for (const sort of Object.keys(expectedAscending) as CardListSort[]) {
      const ascending = {
        ...createCardListConditions(getCardFilterOptions(cards)),
        sort,
        direction: 'asc' as const,
      }
      const descending = { ...ascending, direction: 'desc' as const }
      expect(
        filterAndSortCards(cards, ascending).map((item) => item.id),
        `${sort} asc`,
      ).toEqual(expectedAscending[sort])
      expect(
        filterAndSortCards(cards, descending).map((item) => item.id),
        `${sort} desc`,
      ).toEqual(expectedDescending[sort])
    }
  })

  it('sorts characters by source order and breaks character ties by card order then ID', () => {
    const characterCards = [
      card('a-02', {
        characterId: 'c-a',
        characterOrder: 1,
        order: 9,
        specializations: ['performance'],
      }),
      card('a-01', {
        characterId: 'c-a',
        characterOrder: 1,
        order: 9,
        specializations: ['performance'],
      }),
      card('a-00', {
        characterId: 'c-a',
        characterOrder: 1,
        order: 2,
        specializations: ['performance'],
      }),
      card('b-00', {
        characterId: 'c-b',
        characterOrder: 2,
        order: 1,
        specializations: ['performance'],
      }),
    ]
    const ascending = {
      ...createCardListConditions(getCardFilterOptions(cards)),
      sort: 'character' as const,
      direction: 'asc' as const,
    }
    const descending = { ...ascending, direction: 'desc' as const }

    expect(
      filterAndSortCards(characterCards, ascending).map((item) => item.id),
    ).toEqual(['a-01', 'a-02', 'a-00', 'b-00'])
    expect(
      filterAndSortCards(characterCards, descending).map((item) => item.id),
    ).toEqual(['b-00', 'a-01', 'a-02', 'a-00'])
  })

  it('parses URL values, ignores invalid and duplicate values, and round-trips filters', () => {
    const options = getCardFilterOptions(cards)
    const parsed = parseCardListQuery(
      {
        q: '  Sakura  ',
        character: ['c-a', 'c-a', 'missing'],
        rarity: ['5', '5', '4.2', '999'],
        attribute: ['2', 'x'],
        specialization: ['sense', 'unknown', 'sense'],
        layout: 'vertical',
        sort: 'total',
        direction: 'asc',
        unrelated: 'keep',
      },
      options,
    )
    expect(parsed).toEqual({
      q: 'Sakura',
      character: ['c-a'],
      skill: [],
      rarity: [5],
      attribute: [2],
      specialization: ['sense'],
      sort: 'total',
      direction: 'asc',
    })
    const serialized = toCardListQuery(parsed, options, {
      unrelated: 'keep',
      page: '2',
    })
    expect(serialized).toEqual({
      unrelated: 'keep',
      page: '2',
      q: 'Sakura',
      character: ['c-a'],
      rarity: ['5'],
      attribute: ['2'],
      specialization: ['sense'],
      sort: 'total',
      direction: 'asc',
    })
    expect(parseCardListQuery(serialized, options)).toEqual(parsed)
    expect(
      toCardListQuery(createCardListConditions(options), options, {
        q: 'old',
        layout: 'vertical',
        custom: 'x',
      }),
    ).toEqual({
      custom: 'x',
    })
  })

  it('uses defaults for null, empty, and invalid query values without mutating inputs', () => {
    const options = getCardFilterOptions(cards)
    const query = {
      q: null,
      character: [],
      rarity: [null],
      attribute: [],
      specialization: [null],
      layout: 'poster',
      sort: 'unknown',
      direction: 'sideways',
      custom: ['keep', null],
    }
    const queryBefore = structuredClone(query)
    const conditions = createCardListConditions(options)
    const conditionsBefore = structuredClone(conditions)
    const parsed = parseCardListQuery(query, options)

    expect(parsed).toEqual(createCardListConditions(options))
    expect(query).toEqual(queryBefore)
    expect(conditions).toEqual(conditionsBefore)

    const existingQuery = { q: 'old', custom: ['keep', null] }
    const existingQueryBefore = structuredClone(existingQuery)
    const serialized = toCardListQuery(conditions, options, existingQuery)
    expect(serialized).toEqual({ custom: ['keep', null] })
    expect(existingQuery).toEqual(existingQueryBefore)
  })

  it('distinguishes absent, explicitly empty, invalid-only, and mixed checkbox query values', () => {
    const options = getCardFilterOptions(cards)
    const defaults = createCardListConditions(options)

    expect(parseCardListQuery({}, options)).toEqual(defaults)
    expect(
      parseCardListQuery(
        { rarity: '', attribute: '', specialization: '' },
        options,
      ),
    ).toEqual({ ...defaults, rarity: [], attribute: [], specialization: [] })
    expect(
      parseCardListQuery(
        { rarity: 'invalid', attribute: '99', specialization: 'unknown' },
        options,
      ),
    ).toEqual(defaults)
    expect(
      parseCardListQuery(
        {
          rarity: ['4', 'invalid'],
          attribute: ['2', '99'],
          specialization: ['sense', 'unknown'],
        },
        options,
      ),
    ).toEqual({
      ...defaults,
      rarity: [4],
      attribute: [2],
      specialization: ['sense'],
    })
  })

  it('omits full checkbox selections and serializes empty selections explicitly', () => {
    const options = getCardFilterOptions(cards)
    const defaults = createCardListConditions(options)

    expect(toCardListQuery(defaults, options, { custom: 'keep' })).toEqual({
      custom: 'keep',
    })
    const empty = {
      ...defaults,
      rarity: [],
      attribute: [],
      specialization: [],
    }
    const serialized = toCardListQuery(empty, options, {
      custom: 'keep',
    })
    expect(serialized).toEqual({
      custom: 'keep',
      rarity: '',
      attribute: '',
      specialization: '',
    })
    expect(parseCardListQuery(serialized, options)).toEqual(empty)
  })

  it('uses the selected card image CDN path and returns null when the asset is absent', () => {
    expect(getCardImageUrl('00015')).toBe(
      'https://assets.holodori.net/cdn/img_card_full_00015/Texture2D/img_card_full_00015.webp',
    )
    expect(getCardImageUrl('00015', 'vertical')).toBe(
      'https://assets.holodori.net/cdn/img_card_vert_00015/Texture2D/img_card_vert_00015.webp',
    )
    expect(getCardImageUrl(null)).toBeNull()
    expect(getCardImageUrl('')).toBeNull()
    expect(getCardImageUrl(null, 'vertical')).toBeNull()
    expect(getCardImageUrl('', 'vertical')).toBeNull()
  })
})
