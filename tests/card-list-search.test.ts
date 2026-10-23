import { describe, expect, it } from 'vitest'
import { gameLocales } from '../shared/language.ts'
import type { CardListPayload } from '../shared/game-data/card-list-data.ts'
import { buildCardSearchTextById } from '../shared/game-data/card-list-search.ts'

const localized = (value: string) =>
  Object.fromEntries(gameLocales.map((locale) => [locale, value])) as Record<
    (typeof gameLocales)[number],
    string
  >

function description(templateId: string) {
  return { templateId, params: {} }
}

function payload(): CardListPayload {
  const templates = Object.fromEntries(
    [
      'passive',
      'passive-level-2',
      'active',
      'active-level-2',
      'special',
      'special-level-2',
      'leader',
      'nullable',
    ].map((templateId) => [
      templateId,
      {
        parameters: [],
        text: Object.fromEntries(
          gameLocales.map((locale) => [
            locale,
            templateId === 'passive'
              ? `[attribute=cute]Blue ${locale}[/attribute] [highlight]bird ${locale}[/highlight]`
              : templateId === 'passive-level-2'
                ? `second passive level ${locale}`
                : templateId === 'active-level-2' ||
                    templateId === 'special-level-2'
                  ? `${templateId} keyword ${locale}`
                  : `${templateId} description ${locale}`,
          ]),
        ) as Record<(typeof gameLocales)[number], string>,
      },
    ]),
  )
  const skills = {
    leaderSkills: {
      leader: {
        id: 'leader',
        liveSkillTriggerGroupId: null,
        livePassiveSkillEffectGroupId: 'leader-effect',
        additionalLiveSkillTriggerGroupId: null,
        additionalLivePassiveSkillEffectGroupId: null,
      },
    },
    passiveSkills: {
      passive: [
        {
          livePassiveSkillId: 'passive',
          level: 1,
          liveSkillTriggerGroupId: null,
          livePassiveSkillEffectGroupId: 'passive-effect',
          additionalLiveSkillTriggerGroupId: null,
          additionalLivePassiveSkillEffectGroupId: null,
        },
        {
          livePassiveSkillId: 'passive',
          level: 2,
          liveSkillTriggerGroupId: null,
          livePassiveSkillEffectGroupId: 'passive-level-2',
          additionalLiveSkillTriggerGroupId: null,
          additionalLivePassiveSkillEffectGroupId: null,
        },
        {
          livePassiveSkillId: 'passive',
          level: 3,
          liveSkillTriggerGroupId: null,
          livePassiveSkillEffectGroupId: 'null-description',
          additionalLiveSkillTriggerGroupId: null,
          additionalLivePassiveSkillEffectGroupId: null,
        },
      ],
    },
    activeSkills: {
      active: [
        {
          liveActiveSkillId: 'active',
          level: 1,
          liveSkillTriggerGroupId: null,
          liveActiveSkillEffectGroupId: 'active-effect',
          additionalLiveSkillTriggerGroupId: null,
          additionalLiveActiveSkillEffectGroupId: null,
          coolTimeMillisecond: 5000,
          activationProbabilityPermilMultiply: 370,
          limitCount: null,
          effectDurationMillisecond: null,
        },
        {
          liveActiveSkillId: 'active',
          level: 2,
          liveSkillTriggerGroupId: null,
          liveActiveSkillEffectGroupId: 'active-effect-level-2',
          additionalLiveSkillTriggerGroupId: null,
          additionalLiveActiveSkillEffectGroupId: null,
          coolTimeMillisecond: 5000,
          activationProbabilityPermilMultiply: 370,
          limitCount: null,
          effectDurationMillisecond: null,
        },
      ],
    },
    specialSkills: {
      special: [
        {
          liveSpecialSkillId: 'special',
          level: 1,
          liveActiveSkillEffectGroupId: 'special-effect',
          additionalLiveSkillTriggerGroupId: null,
          additionalLiveActiveSkillEffectGroupId: null,
          effectDurationMillisecond: 5000,
        },
        {
          liveSpecialSkillId: 'special',
          level: 2,
          liveActiveSkillEffectGroupId: 'special-effect-level-2',
          additionalLiveSkillTriggerGroupId: null,
          additionalLiveActiveSkillEffectGroupId: null,
          effectDurationMillisecond: 5000,
        },
      ],
    },
    effects: {
      ...Object.fromEntries(
        [
          ['leader-effect', 'leader'],
          ['passive-effect', 'passive'],
          ['passive-level-2', 'passive-level-2'],
        ].map(([groupId, templateId]) => [
          groupId,
          [{ type: 1, description: description(templateId!) }],
        ]),
      ),
      'null-description': [{ type: 1, description: null }],
    },
    activeEffects: Object.fromEntries(
      [
        ['active-effect', 'active'],
        ['active-effect-level-2', 'active-level-2'],
        ['special-effect', 'special'],
        ['special-effect-level-2', 'special-level-2'],
      ].map(([groupId, templateId]) => [
        groupId,
        [{ type: 1, description: description(templateId!) }],
      ]),
    ),
    triggers: {},
    targets: [],
    catalog: {
      templates,
      labels: {
        character: {},
        group: {},
        attribute: {},
        judgement: {},
        probability: { '370': localized('often') },
      },
    },
  } as CardListPayload['skills']

  return {
    cards: [
      {
        id: 'card',
        characterId: 'character',
        costumeId: 'costume',
        livePassiveSkillId: 'passive',
        liveActiveSkillId: 'active',
        liveSpecialSkillId: 'special',
        skillTreeConnectEffectId: 'connect',
        characterOrder: 1,
        characterAssetId: null,
        name: localized('Card Sakura'),
        characterName: localized('Character Miko'),
        rarity: 3,
        attributeType: 1,
        assetId: null,
        order: 1,
        stats: { performance: 1, technique: 1, sense: 1 },
        total: 3,
        level: 1,
        specializations: [],
      },
    ],
    costumes: {
      costume: { name: localized('Blue Costume'), leaderSkillId: 'leader' },
    },
    skills,
    connectEffects: {
      connect: [
        {
          level: 1,
          extentGroupId: 'extent',
          description: Object.fromEntries(
            gameLocales.map((locale) => [locale, `connect bonus ${locale}`]),
          ) as Record<(typeof gameLocales)[number], string>,
        },
      ],
    },
    connectExtents: {},
    searchTextByCardId: {},
  }
}

describe('card list search index', () => {
  it('indexes all six locales and all searchable card content', () => {
    const index = buildCardSearchTextById(payload())
    const text = index.card!

    for (const value of [
      'card sakura',
      'character miko',
      'blue costume',
      ...gameLocales.flatMap((locale) => [
        `blue ${locale} bird ${locale}`,
        `second passive level ${locale}`,
        `active description ${locale}`,
        `active-level-2 keyword ${locale}`,
        `special description ${locale}`,
        `special-level-2 keyword ${locale}`,
        `leader description ${locale}`,
        `connect bonus ${locale}`,
      ]),
      'often',
    ]) {
      expect(text).toContain(value)
    }
    expect(text).not.toContain('[attribute=cute]')
    expect(text).not.toContain('[highlight]')
    expect(text).not.toContain('nullable description')
    expect(text.match(/card sakura/g)).toHaveLength(1)
  })

  it('handles empty cards and cards without costume or Connect data', () => {
    const source = payload()
    source.cards[0]!.costumeId = null
    source.cards[0]!.skillTreeConnectEffectId = null
    delete source.costumes.costume
    delete source.connectEffects.connect

    expect(buildCardSearchTextById({ ...source, cards: [] })).toEqual({})
    const text = buildCardSearchTextById(source).card!
    expect(text).not.toContain('blue costume')
    expect(text).not.toContain('leader description')
    expect(text).not.toContain('connect bonus')
    expect(text).toContain('active-level-2 keyword jpn')
    expect(text).toContain('special-level-2 keyword jpn')
  })
})
