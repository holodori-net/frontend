import { describe, expect, it } from 'vitest'
import type { CardListItemData } from '../shared/game-data/card-list-data.ts'
import type { LocalizedText } from '../shared/game-data/localized-text.ts'
import {
  buildCardConnectFilterCatalog,
  countCardConnectOptions,
} from '../shared/game-data/card-connect-filter.ts'
import { gameLocales } from '../shared/language.ts'

const card = (id: string, effectId: string | null) =>
  ({ id, skillTreeConnectEffectId: effectId }) as CardListItemData
const description = Object.fromEntries(
  gameLocales.map((locale) => [locale, '']),
) as LocalizedText

describe('card connect filter catalog', () => {
  it('maps the documented 17 shape and direction variants by extent ID', () => {
    const ids = [
      'card_area-001',
      'card_area-002',
      'card_area-003',
      'card_area-004',
      'center_area-001',
      'center_area-002',
      'center_area-003',
      'center_area-004',
      'center_area-005',
      'content_area-001',
      'content_area-002',
      'content_area-003',
      'content_area-004',
      'general_purpose_area-001',
      'leader_area-001',
      'leader_area-002',
      'leader_area-003',
    ]
    const catalog = buildCardConnectFilterCatalog({
      cards: [card('card-1', 'effect')],
      connectEffects: {
        effect: ids.map((id, level) => ({
          level,
          extentGroupId: `skill_tree_connect_effect_extent-${id}`,
          description,
        })),
      },
      connectExtents: Object.fromEntries(
        ids.map((id) => [`skill_tree_connect_effect_extent-${id}`, []]),
      ),
    })

    expect(catalog.options).toHaveLength(17)
    expect(
      catalog.options.every(({ shape, direction }) => shape && direction),
    ).toBe(true)
    const byKey = Object.fromEntries(
      catalog.options.map(({ key, shape, direction }) => [
        key.replace(/^skill_tree_connect_effect_extent-/, ''),
        [shape, direction],
      ]),
    )
    expect(byKey).toMatchObject({
      'center_area-001': ['cross', 'up'],
      'center_area-002': ['cross', 'right'],
      'center_area-003': ['cross', 'left'],
      'center_area-005': ['cross', 'down'],
      'card_area-004': ['corner', 'upLeft'],
      'center_area-004': ['corner', 'downLeft'],
      'content_area-004': ['corner', 'downRight'],
      'leader_area-003': ['corner', 'upRight'],
    })
  })

  it('projects referenced extents from every effect level and sorts IDs', () => {
    const positionsA = [{ x: 1, y: 0 }]
    const positionsB = [{ x: 0, y: 1 }]
    const catalog = buildCardConnectFilterCatalog({
      cards: [
        card('card-b', 'effect-b'),
        card('card-null', null),
        card('card-a', 'effect-a'),
      ],
      connectEffects: {
        'effect-a': [
          { level: 1, extentGroupId: 'extent-z', description },
          { level: 2, extentGroupId: 'extent-a', description },
          { level: 3, extentGroupId: 'extent-z', description },
        ],
        'effect-b': [{ level: 1, extentGroupId: 'extent-z', description }],
      },
      connectExtents: { 'extent-z': positionsA, 'extent-a': positionsB },
    })

    expect(catalog.options.map(({ key }) => key)).toEqual([
      'extent-a',
      'extent-z',
    ])
    expect(catalog.options[0]?.positions).toBe(positionsB)
    expect(catalog.options[1]?.positions).toBe(positionsA)
    expect(catalog.cardExtents).toEqual({
      'card-b': ['extent-z'],
      'card-null': [],
      'card-a': ['extent-a', 'extent-z'],
    })
  })

  it('keeps unknown shapes selectable without invented metadata', () => {
    const catalog = buildCardConnectFilterCatalog({
      cards: [card('card-1', 'effect')],
      connectEffects: {
        effect: [{ level: 1, extentGroupId: 'future-area-001', description }],
      },
      connectExtents: { 'future-area-001': [{ x: 0, y: 1 }] },
    })

    expect(catalog.options).toEqual([
      {
        key: 'future-area-001',
        positions: [{ x: 0, y: 1 }],
        shape: null,
        direction: null,
      },
    ])
  })

  it('counts matching unique cards once and includes options with zero matches', () => {
    const options = [
      { key: 'extent-a', positions: [], shape: null, direction: null },
      { key: 'extent-b', positions: [], shape: null, direction: null },
      { key: 'extent-c', positions: [], shape: null, direction: null },
    ] as const
    expect(
      countCardConnectOptions(
        options,
        ['card-1', 'card-1', 'card-2', 'card-null'],
        {
          'card-1': ['extent-a', 'extent-a', 'extent-b'],
          'card-2': ['extent-a'],
          'card-null': [],
        },
      ),
    ).toEqual({ 'extent-a': 2, 'extent-b': 1, 'extent-c': 0 })
  })
})
