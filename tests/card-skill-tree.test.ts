import { describe, expect, it } from 'vitest'
import {
  buildCardSkillEffectTree,
  countCardSkillTreeCards,
  filterCardSkillTree,
  projectCardSkillTreeSelection,
  updateCardSkillTreeSelection,
  type CardSkillTreeNode,
} from '../shared/game-data/card-skill-tree.ts'

const effectTree: CardSkillTreeNode[] = [
  {
    key: 'all-score',
    children: [
      { key: 'all-score-a', canonicalKey: 'a' },
      { key: 'all-score-b', canonicalKey: 'b' },
    ],
  },
  {
    key: 'conditional-judgement',
    children: [{ key: 'conditional-judgement-a', canonicalKey: 'a' }],
  },
]

describe('card skill tree selection adapter', () => {
  it('counts visible cards once across skills and duplicate group occurrences', () => {
    const tree: CardSkillTreeNode[] = [
      {
        key: 'effect:score',
        children: [
          {
            key: 'effect:score:all',
            children: [
              { key: 'all:a', canonicalKey: 'a' },
              { key: 'all:b', canonicalKey: 'b' },
            ],
          },
          {
            key: 'effect:score:conditional',
            children: [{ key: 'conditional:a', canonicalKey: 'a' }],
          },
        ],
      },
    ]
    const cardSkills = {
      card1: ['a', 'b'],
      card2: ['a'],
      card3: ['b', 'c'],
    }

    expect(
      countCardSkillTreeCards(tree, ['card1', 'card2'], cardSkills),
    ).toEqual({
      'all:a': 2,
      'all:b': 1,
      'effect:score:all': 2,
      'conditional:a': 2,
      'effect:score:conditional': 2,
      'effect:score': 2,
    })
    expect(countCardSkillTreeCards(tree, ['card3'], cardSkills)).toEqual({
      'all:a': 0,
      'all:b': 1,
      'effect:score:all': 1,
      'conditional:a': 0,
      'effect:score:conditional': 0,
      'effect:score': 1,
    })
    expect(countCardSkillTreeCards(tree, [], cardSkills)).toEqual({
      'all:a': 0,
      'all:b': 0,
      'effect:score:all': 0,
      'conditional:a': 0,
      'effect:score:conditional': 0,
      'effect:score': 0,
    })
  })

  it('recounts group unions after search removes unmatched skill leaves', () => {
    const tree: CardSkillTreeNode[] = [
      {
        key: 'effect:score',
        label: 'Score',
        children: [
          {
            key: 'effect:score:all',
            label: 'All types',
            children: [
              { key: 'score-up', label: 'Score up', canonicalKey: 'a' },
              { key: 'judgement', label: 'Judgement', canonicalKey: 'b' },
            ],
          },
        ],
      },
    ]
    const visible = filterCardSkillTree(tree, 'Score up')

    expect(
      countCardSkillTreeCards(visible, ['card1', 'card2'], {
        card1: ['a', 'b'],
        card2: ['b'],
      }),
    ).toEqual({
      'score-up': 1,
      'effect:score:all': 1,
      'effect:score': 1,
    })
  })

  it('builds effect roots with grouped variants and supports root selection', () => {
    const options = [
      {
        key: 'support',
        effects: ['score', 'judgement'],
        conditionalEffects: ['judgement'],
        pureEffects: [],
      },
      {
        key: 'score',
        effects: ['score'],
        conditionalEffects: [],
        pureEffects: ['score'],
      },
    ]
    const tree = buildCardSkillEffectTree(
      options,
      ['score', 'judgement'],
      [
        { key: 'all', label: 'All types' },
        { key: 'conditional', label: 'Conditional' },
        { key: 'pure', label: 'Single effect' },
        { key: 'additional', label: 'Multiple effects' },
      ],
      { score: 'Score', judgement: 'Judgement' },
      (option, key) => ({ key, label: option.key, canonicalKey: option.key }),
    )

    expect(tree.map(({ key }) => key)).toEqual([
      'effect:score',
      'effect:judgement',
    ])
    expect(tree[0]?.children?.map(({ label }) => label)).toEqual([
      'All types',
      'Single effect',
      'Multiple effects',
    ])
    expect(tree[1]?.children?.map(({ label }) => label)).toEqual([
      'All types',
      'Conditional',
      'Multiple effects',
    ])

    const filtered = filterCardSkillTree(tree, 'support')
    expect(filtered).toHaveLength(2)
    expect(filtered[0]?.children?.[0]?.children).toHaveLength(1)
    expect(filtered[1]?.children?.[1]?.children).toHaveLength(1)

    const projection = projectCardSkillTreeSelection(tree, new Set(['score']))
    expect(projection.keys['effect:score']).toEqual({
      checked: false,
      partialChecked: true,
    })
    const next = { ...projection.keys }
    next['effect:score'] = { checked: true, partialChecked: false }
    for (const variant of tree[0]?.children ?? []) {
      next[variant.key] = { checked: true, partialChecked: false }
      for (const leaf of variant.children ?? []) {
        next[leaf.key] = { checked: true, partialChecked: false }
      }
    }
    expect(
      updateCardSkillTreeSelection(tree, new Set(['score']), next),
    ).toEqual(['score', 'support'])
  })

  it('removes a canonical selection when any duplicate leaf is unchecked', () => {
    const selected = new Set(['a'])
    const next = projectCardSkillTreeSelection(effectTree, selected).keys
    delete next['conditional-judgement-a']

    expect(updateCardSkillTreeSelection(effectTree, selected, next)).toEqual([])
  })

  it('selects every leaf when a parent is checked', () => {
    const next = projectCardSkillTreeSelection(effectTree, new Set()).keys
    next['all-score'] = { checked: true, partialChecked: false }
    next['all-score-a'] = { checked: true, partialChecked: false }
    next['all-score-b'] = { checked: true, partialChecked: false }

    expect(updateCardSkillTreeSelection(effectTree, new Set(), next)).toEqual([
      'a',
      'b',
    ])
  })

  it('projects partial parent state and omits unchecked keys', () => {
    const projection = projectCardSkillTreeSelection(effectTree, new Set(['a']))

    expect(projection.keys['all-score']).toEqual({
      checked: false,
      partialChecked: true,
    })
    expect(projection.keys['conditional-judgement']).toEqual({
      checked: true,
      partialChecked: false,
    })
    expect(projection.keys['all-score-b']).toBeUndefined()
  })

  it('preserves selected leaves hidden by the active tree filter', () => {
    const selected = new Set(['hidden'])
    const filteredTree: CardSkillTreeNode[] = [
      {
        key: 'visible-results',
        children: [
          { key: 'visible', canonicalKey: 'visible' },
          { key: 'hidden', canonicalKey: 'hidden' },
        ],
      },
    ]
    const next = projectCardSkillTreeSelection(filteredTree, selected).keys
    next.visible = { checked: true, partialChecked: false }
    next['visible-results'] = { checked: true, partialChecked: false }

    expect(updateCardSkillTreeSelection(filteredTree, selected, next)).toEqual([
      'hidden',
      'visible',
    ])
  })

  it('lets a filtered parent toggle off visible leaves while retaining hidden selections', () => {
    const tree: CardSkillTreeNode[] = [
      {
        key: 'passive',
        label: 'Passive',
        children: [
          { key: 'score-a', label: 'Score up', canonicalKey: 'a' },
          { key: 'score-b', label: 'Score support', canonicalKey: 'b' },
          { key: 'life', label: 'Life recovery', canonicalKey: 'c' },
        ],
      },
    ]
    const hiddenSelection = new Set(['outside'])
    const visible = filterCardSkillTree(tree, 'Score')
    const initialProjection = projectCardSkillTreeSelection(
      visible,
      hiddenSelection,
    )
    const parentChecked = {
      ...initialProjection.keys,
      passive: { checked: true, partialChecked: false },
      'score-a': { checked: true, partialChecked: false },
      'score-b': { checked: true, partialChecked: false },
    }
    const selected = new Set(
      updateCardSkillTreeSelection(visible, hiddenSelection, parentChecked),
    )

    expect(projectCardSkillTreeSelection(tree, selected).keys.passive).toEqual({
      checked: false,
      partialChecked: true,
    })

    const searchedAgain = filterCardSkillTree(tree, 'Score')
    expect(
      projectCardSkillTreeSelection(searchedAgain, selected).keys.passive,
    ).toEqual({
      checked: true,
      partialChecked: false,
    })
    expect(updateCardSkillTreeSelection(searchedAgain, selected, {})).toEqual([
      'outside',
    ])
  })

  it('keeps logical selections when switching between tree groupings', () => {
    const selected = new Set(['a'])
    const kindTree: CardSkillTreeNode[] = [
      { key: 'passive', children: [{ key: 'passive-a', canonicalKey: 'a' }] },
    ]
    const kindProjection = projectCardSkillTreeSelection(kindTree, selected)

    expect(kindProjection.keys['passive-a']?.checked).toBe(true)
    expect(
      updateCardSkillTreeSelection(kindTree, selected, kindProjection.keys),
    ).toEqual(['a'])
    const filteredKindTree = filterCardSkillTree(
      [
        {
          key: 'passive',
          label: 'Passive',
          children: [
            { key: 'passive-a', label: 'Score up', canonicalKey: 'a' },
          ],
        },
      ],
      'Score',
    )
    expect(filteredKindTree.map(({ key }) => key)).toEqual(['passive'])
  })
})
