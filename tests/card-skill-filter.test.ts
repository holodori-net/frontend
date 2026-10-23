import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { readCardList } from '../server/data/card-list.ts'
import type { CardListPayload } from '../shared/game-data/card-list-data.ts'
import {
  buildCardSkillFilterCatalog,
  mergeSkillLevelDescriptions,
  mergeStructuredSkillValues,
} from '../shared/game-data/card-skill-filter.ts'

const text = {
  jpn: '効果',
  eng: 'Effect',
  ind: 'Efek',
  kor: '효과',
  cht: '效果',
  chs: '效果',
}

function payload(): CardListPayload {
  return {
    cards: [
      {
        id: 'card-1',
        characterId: 'c',
        costumeId: 'costume',
        name: text,
        characterName: text,
        rarity: 1,
        attributeType: 1,
        assetId: null,
        order: 1,
        characterOrder: 1,
        characterAssetId: null,
        stats: { performance: 1, technique: 1, sense: 1 },
        total: 3,
        level: 1,
        specializations: [],
        livePassiveSkillId: 'p1',
        liveActiveSkillId: 'a1',
        liveSpecialSkillId: 's1',
        skillTreeConnectEffectId: null,
      },
    ],
    costumes: { costume: { name: text, leaderSkillId: 'l1' } },
    skills: {
      leaderSkills: {
        l1: {
          id: 'l1',
          liveSkillTriggerGroupId: null,
          livePassiveSkillEffectGroupId: 'e4',
          additionalLiveSkillTriggerGroupId: null,
          additionalLivePassiveSkillEffectGroupId: null,
        },
        l2: {
          id: 'l2',
          liveSkillTriggerGroupId: null,
          livePassiveSkillEffectGroupId: 'e4',
          additionalLiveSkillTriggerGroupId: null,
          additionalLivePassiveSkillEffectGroupId: null,
        },
      },
      passiveSkills: {
        p1: [1, 2].map((level) => ({
          livePassiveSkillId: 'p1',
          level,
          liveSkillTriggerGroupId: null,
          livePassiveSkillEffectGroupId: level === 1 ? 'e4' : 'e4alias',
          additionalLiveSkillTriggerGroupId: null,
          additionalLivePassiveSkillEffectGroupId: null,
        })),
        p2: [
          {
            livePassiveSkillId: 'p2',
            level: 1,
            liveSkillTriggerGroupId: 't1',
            livePassiveSkillEffectGroupId: 'e4',
            additionalLiveSkillTriggerGroupId: null,
            additionalLivePassiveSkillEffectGroupId: null,
          },
        ],
        p3: [
          {
            livePassiveSkillId: 'p3',
            level: 1,
            liveSkillTriggerGroupId: null,
            livePassiveSkillEffectGroupId: 'e4',
            additionalLiveSkillTriggerGroupId: null,
            additionalLivePassiveSkillEffectGroupId: null,
          },
        ],
        p4: [
          {
            livePassiveSkillId: 'p4',
            level: 1,
            liveSkillTriggerGroupId: null,
            livePassiveSkillEffectGroupId: 'e4',
            additionalLiveSkillTriggerGroupId: null,
            additionalLivePassiveSkillEffectGroupId: 'e4additional',
          },
        ],
        pmiss1: [
          {
            livePassiveSkillId: 'pmiss1',
            level: 1,
            liveSkillTriggerGroupId: null,
            livePassiveSkillEffectGroupId: 'missing-one',
            additionalLiveSkillTriggerGroupId: null,
            additionalLivePassiveSkillEffectGroupId: null,
          },
        ],
        pmiss2: [
          {
            livePassiveSkillId: 'pmiss2',
            level: 1,
            liveSkillTriggerGroupId: null,
            livePassiveSkillEffectGroupId: 'missing-two',
            additionalLiveSkillTriggerGroupId: null,
            additionalLivePassiveSkillEffectGroupId: null,
          },
        ],
      },
      activeSkills: {
        a1: [
          {
            liveActiveSkillId: 'a1',
            level: 1,
            liveSkillTriggerGroupId: null,
            liveActiveSkillEffectGroupId: 'ae1',
            additionalLiveSkillTriggerGroupId: null,
            additionalLiveActiveSkillEffectGroupId: null,
            coolTimeMillisecond: 17000,
            activationProbabilityPermilMultiply: 370,
            limitCount: null,
            effectDurationMillisecond: 6000,
          },
          {
            liveActiveSkillId: 'a1',
            level: 2,
            liveSkillTriggerGroupId: null,
            liveActiveSkillEffectGroupId: 'ae2',
            additionalLiveSkillTriggerGroupId: null,
            additionalLiveActiveSkillEffectGroupId: null,
            coolTimeMillisecond: 17000,
            activationProbabilityPermilMultiply: 460,
            limitCount: null,
            effectDurationMillisecond: 6000,
          },
        ],
      },
      specialSkills: {
        s1: [
          {
            liveSpecialSkillId: 's1',
            level: 1,
            liveActiveSkillEffectGroupId: 'ae1',
            additionalLiveSkillTriggerGroupId: null,
            additionalLiveActiveSkillEffectGroupId: null,
            effectDurationMillisecond: 1000,
          },
        ],
      },
      effects: {
        e4: [
          {
            type: 4,
            description: {
              templateId: 'e',
              params: {
                amount: '40',
                group: { kind: 'group', id: 'generation' },
              },
            },
          },
        ],
        e4alias: [
          {
            type: 4,
            description: {
              templateId: 'e',
              params: {
                amount: '55',
                group: { kind: 'group', id: 'generation' },
              },
            },
          },
        ],
        e4additional: [
          {
            type: 4,
            description: {
              templateId: 'e',
              params: {
                amount: '60',
                group: { kind: 'group', id: 'generation' },
              },
            },
          },
        ],
      },
      activeEffects: {
        ae1: [
          {
            type: 1,
            description: { templateId: 'ae', params: { amount: '35' } },
          },
        ],
        ae2: [
          {
            type: 1,
            description: { templateId: 'ae', params: { amount: '40' } },
          },
        ],
      },
      triggers: { t1: [{ description: { templateId: 't', params: {} } }] },
      targets: [],
      catalog: {
        templates: {
          e: {
            domain: 'effect',
            type: 4,
            parameters: ['group', 'amount'],
            text: {
              jpn: '{group}得点上昇{amount}%',
              eng: '{group} score up {amount}%',
              ind: '{group} skor {amount}%',
              kor: '{group} 점수 {amount}%',
              cht: '{group}得分提升{amount}%',
              chs: '{group}得分提升{amount}%',
            },
          },
          ae: {
            domain: 'activeEffect',
            type: 1,
            parameters: ['amount'],
            text: {
              jpn: '得点{amount}%',
              eng: 'Score {amount}%',
              ind: 'Skor {amount}%',
              kor: '점수 {amount}%',
              cht: '得分{amount}%',
              chs: '得分{amount}%',
            },
          },
          t: { domain: 'trigger', type: 1, parameters: [], text },
        },
        labels: {
          character: {},
          group: {
            generation: {
              jpn: '0期生',
              eng: 'Generation 0',
              ind: 'Angkatan 0',
              kor: '0기생',
              cht: '0期生',
              chs: '0期生',
            },
          },
          probability: {
            '370': {
              jpn: '低確率',
              eng: 'Low',
              ind: 'Rendah',
              kor: '낮음',
              cht: '低機率',
              chs: '低概率',
            },
            '460': {
              jpn: '中確率',
              eng: 'Medium',
              ind: 'Sedang',
              kor: '중간',
              cht: '中機率',
              chs: '中等概率',
            },
          },
          attribute: {},
          judgement: {},
        },
      },
    },
    connectEffects: {},
    connectExtents: {},
    searchTextByCardId: {},
  } satisfies CardListPayload
}

describe('buildCardSkillFilterCatalog', () => {
  it('merges equivalent aliases, maps card skills, and retains paired conditions', () => {
    const result = buildCardSkillFilterCatalog(payload())
    expect(result.canonicalKeys['passive:p1']).toBe('passive:p1')
    expect(result.canonicalKeys['leader:l1']).toBe('leader:l1')
    expect(result.canonicalKeys['leader:l2']).toBe('leader:l1')
    expect(result.canonicalKeys['passive:p3']).toBe('passive:p3')
    expect(result.canonicalKeys['passive:p1']).not.toBe(
      result.canonicalKeys['passive:p3'],
    )
    expect(result.cardSkills['card-1']).toEqual([
      'passive:p1',
      'active:a1',
      'special:s1',
      'leader:l1',
    ])
    expect(
      result.options.find(({ key }) => key === 'active:a1')?.descriptions.eng,
    ).toContain('Score 35/40%')
    expect(
      result.options.find(({ key }) => key === 'active:a1')?.descriptions.eng,
    ).toContain('6s')
    expect(
      result.options.find(({ key }) => key === 'active:a1')?.descriptions.eng,
    ).toContain('Low/Medium')
    expect(
      result.options.find(({ key }) => key === 'passive:p1'),
    ).toMatchObject({
      effects: ['performance'],
      pureEffects: ['performance'],
      conditionalEffects: [],
    })
    expect(
      result.options.find(({ key }) => key === 'passive:p2'),
    ).toMatchObject({
      effects: ['performance'],
      pureEffects: [],
      conditionalEffects: ['performance'],
    })
  })

  it('keeps missing groups distinct and merges values by description position', () => {
    const result = buildCardSkillFilterCatalog(payload())
    expect(result.canonicalKeys['passive:pmiss1']).not.toBe(
      result.canonicalKeys['passive:pmiss2'],
    )
    const separate = result.options.find(({ key }) => key === 'passive:p4')
    expect(separate?.descriptions.eng).toBe(
      'Generation 0 score up 40%; Generation 0 score up 60%',
    )
  })

  it('keeps sources distinct when a shared description cannot be resolved', () => {
    const data = payload()
    data.skills.effects.e4 = [{ type: 4, description: null }]
    const result = buildCardSkillFilterCatalog(data)
    expect(result.canonicalKeys['leader:l1']).not.toBe(
      result.canonicalKeys['leader:l2'],
    )
  })

  it('uses localized labels when resolving semantic descriptions', () => {
    const result = buildCardSkillFilterCatalog(payload())
    expect(
      result.options.find(({ key }) => key === 'passive:p1')?.descriptions,
    ).toMatchObject({ jpn: '0期生得点上昇40/55%', cht: '0期生得分提升40/55%' })
  })

  it('merges structured numeric strings in level order and preserves entity text', () => {
    expect(mergeStructuredSkillValues(['150', '200'])).toBe('150/200')
    expect(mergeStructuredSkillValues(['1', '2', '1'])).toBe('1/2/1')
    expect(
      mergeSkillLevelDescriptions([
        { level: 1, description: '支援0期生，得分提升35%' },
        { level: 2, description: '支援0期生，得分提升40%' },
      ]),
    ).toBe('Lv. 1: 支援0期生，得分提升35% / Lv. 2: 支援0期生，得分提升40%')
  })

  it('falls back to complete level descriptions when structured shapes differ', () => {
    expect(
      mergeSkillLevelDescriptions([
        {
          level: 1,
          description: 'A \uE0000:amount\uE001',
          fields: ['amount'],
          values: ['10'],
        },
        {
          level: 2,
          description: 'A \uE0000:other\uE001',
          fields: ['other'],
          values: ['20'],
        },
      ]),
    ).toBe('Lv. 1: A 10 / Lv. 2: A 20')
  })

  it.skipIf(!existsSync(new URL('../.data/master.sqlite', import.meta.url)))(
    'builds a stable catalog from the local master snapshot',
    () => {
      const result = buildCardSkillFilterCatalog(readCardList())
      expect(Object.keys(result.cardSkills)).toHaveLength(196)
      expect(result.options).toHaveLength(368)
      expect(Object.keys(result.canonicalKeys)).toHaveLength(784)
      expect(
        result.options.every(
          ({ descriptions }) => Object.keys(descriptions).length === 6,
        ),
      ).toBe(true)
    },
  )
})
