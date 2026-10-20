import { describe, expect, it, vi } from 'vitest'
import { gameLocales, type GameLocale } from '../../shared/language.ts'
import {
  composeActiveSkillDescription,
  composePassiveSkillDescription,
  composeSpecialSkillDescription,
  type CardSkillDescriptionData,
} from '../../shared/game-data/live-skill-description.ts'

const localized = (text: string) =>
  Object.fromEntries(gameLocales.map((locale) => [locale, text])) as Record<
    GameLocale,
    string
  >

function createData(): CardSkillDescriptionData {
  return {
    effects: {
      passive: [
        {
          description: { templateId: 'passive-effect', params: {} },
        },
      ],
      'passive-additional': [
        {
          description: {
            templateId: 'passive-additional-effect',
            params: {},
          },
        },
      ],
    },
    activeEffects: {
      active: [
        {
          description: { templateId: 'active-effect', params: {} },
        },
      ],
      additional: [
        {
          description: { templateId: 'additional-effect', params: {} },
        },
      ],
      special: [
        {
          description: { templateId: 'special-effect', params: {} },
        },
      ],
    },
    triggers: {
      passive: [
        {
          description: { templateId: 'passive-trigger', params: {} },
        },
      ],
      additional: [
        {
          description: { templateId: 'additional-trigger', params: {} },
        },
      ],
      'passive-additional': [
        {
          description: { templateId: 'passive-additional-trigger', params: {} },
        },
      ],
    },
    targets: [],
    catalog: {
      templates: {
        'passive-effect': {
          parameters: [],
          text: localized('Power [highlight]7[/highlight]%'),
        },
        'passive-trigger': {
          parameters: [],
          text: localized('TRIGGER'),
        },
        'passive-additional-trigger': {
          parameters: [],
          text: localized('COND'),
        },
        'passive-additional-effect': {
          parameters: [],
          text: localized('PASSIVE ADDITIONAL'),
        },
        'active-effect': {
          parameters: [],
          text: localized('SCORE'),
        },
        'additional-effect': {
          parameters: [],
          text: localized('ADD'),
        },
        'special-effect': {
          parameters: [],
          text: localized('SPECIAL'),
        },
        'additional-trigger': {
          parameters: [],
          text: {
            jpn: 'COND',
            eng: 'COND,',
            ind: 'COND,',
            kor: 'COND',
            cht: 'COND',
            chs: 'COND',
          },
        },
      },
      labels: {
        character: {},
        group: {},
        attribute: {},
        judgement: {},
        probability: {
          '370': {
            jpn: '低確率',
            eng: 'Low Probability',
            ind: 'Peluang Rendah',
            kor: '낮은 확률',
            cht: '低機率',
            chs: '低概率',
          },
          '460': {
            jpn: '中確率',
            eng: 'Medium Probability',
            ind: 'Peluang Sedang',
            kor: '중간 확률',
            cht: '中機率',
            chs: '中等概率',
          },
          '550': {
            jpn: '高確率',
            eng: 'High Probability',
            ind: 'Peluang Tinggi',
            kor: '높은 확률',
            cht: '高機率',
            chs: '高概率',
          },
        },
      },
    },
  }
}

const passiveSkill = {
  livePassiveSkillId: 'passive-skill',
  level: 1,
  liveSkillTriggerGroupId: 'passive',
  livePassiveSkillEffectGroupId: 'passive',
  additionalLiveSkillTriggerGroupId: null,
  additionalLivePassiveSkillEffectGroupId: null,
}

const activeSkill = {
  liveActiveSkillId: 'active-skill',
  level: 1,
  liveSkillTriggerGroupId: null,
  liveActiveSkillEffectGroupId: 'active',
  additionalLiveSkillTriggerGroupId: null,
  additionalLiveActiveSkillEffectGroupId: null,
  coolTimeMillisecond: 17000,
  activationProbabilityPermilMultiply: 370,
  limitCount: null,
  effectDurationMillisecond: 6000,
}

const specialSkill = {
  liveSpecialSkillId: 'special-skill',
  level: 1,
  liveActiveSkillEffectGroupId: 'special',
  additionalLiveSkillTriggerGroupId: null,
  additionalLiveActiveSkillEffectGroupId: null,
  effectDurationMillisecond: 8000,
}

describe('card skill description composition', () => {
  it.each([
    ['jpn', 'TRIGGERPower 7%'],
    ['eng', 'TRIGGER Power 7%'],
    ['ind', 'Saat TRIGGER, Power 7%'],
    ['kor', 'TRIGGER Power 7%'],
    ['cht', 'TRIGGERPower 7%'],
    ['chs', 'TRIGGERPower 7%'],
  ] as const)('restores passive source text in %s', (locale, expected) => {
    expect(
      composePassiveSkillDescription(passiveSkill, createData(), locale),
    ).toBe(expected)
  })

  it('composes passive main and additional segments independently', () => {
    const data = createData()
    const skill = {
      ...passiveSkill,
      additionalLiveSkillTriggerGroupId: 'passive-additional',
      additionalLivePassiveSkillEffectGroupId: 'passive-additional',
    }

    expect(composePassiveSkillDescription(skill, data, 'jpn')).toBe(
      'TRIGGERPower 7%\nCONDPASSIVE ADDITIONAL',
    )
    expect(composePassiveSkillDescription(skill, data, 'eng')).toBe(
      'TRIGGER Power 7% COND PASSIVE ADDITIONAL',
    )
    expect(composePassiveSkillDescription(skill, data, 'ind')).toBe(
      'Saat TRIGGER, Power 7% Saat COND, PASSIVE ADDITIONAL',
    )
    expect(
      composePassiveSkillDescription(
        {
          ...passiveSkill,
          additionalLivePassiveSkillEffectGroupId: 'passive-additional',
        },
        data,
        'eng',
      ),
    ).toBe('TRIGGER Power 7% PASSIVE ADDITIONAL')
  })

  it.each([
    ['jpn', '17秒毎に低確率で6秒間SCORE'],
    ['eng', 'For 6s, SCORE Every 17s with a Low Probability chance.'],
    ['ind', 'Selama 6 dtk, SCORE setiap 17 dtk dengan Peluang Rendah'],
    ['kor', '17초마다 낮은 확률로  6초 동안 SCORE'],
    ['cht', '每 17 秒以低機率在 6 秒內SCORE'],
    ['chs', '每 17 秒以低概率在 6 秒内SCORE'],
  ] as const)(
    'composes active cooldown and probability in %s',
    (locale, expected) => {
      expect(
        composeActiveSkillDescription(activeSkill, createData(), locale),
      ).toBe(expected)
    },
  )

  it('supports active effects without duration and fractional seconds', () => {
    const data = createData()
    expect(
      composeActiveSkillDescription(
        { ...activeSkill, effectDurationMillisecond: null },
        data,
        'jpn',
      ),
    ).toBe('17秒毎に低確率でSCORE')
    expect(
      composeActiveSkillDescription(
        { ...activeSkill, effectDurationMillisecond: 1500 },
        data,
        'eng',
      ),
    ).toBe('For 1.5s, SCORE Every 17s with a Low Probability chance.')
  })

  it.each([
    ['jpn', '8秒間SPECIAL'],
    ['eng', 'For 8s, SPECIAL'],
    ['ind', 'Selama 8 dtk, SPECIAL'],
    ['kor', '8초 동안 SPECIAL'],
    ['cht', '在 8 秒內SPECIAL'],
    ['chs', '在 8 秒内SPECIAL'],
  ] as const)('composes special duration in %s', (locale, expected) => {
    expect(
      composeSpecialSkillDescription(specialSkill, createData(), locale),
    ).toBe(expected)
  })

  it('preserves source line breaks and locale specific additional clauses', () => {
    const data = createData()
    const active = {
      ...activeSkill,
      additionalLiveSkillTriggerGroupId: 'additional',
      additionalLiveActiveSkillEffectGroupId: 'additional',
    }
    const special = {
      ...specialSkill,
      additionalLiveSkillTriggerGroupId: 'additional',
      additionalLiveActiveSkillEffectGroupId: 'additional',
    }

    expect(composeActiveSkillDescription(active, data, 'jpn')).toBe(
      '17秒毎に低確率で6秒間SCORE\nCONDADD',
    )
    expect(composeActiveSkillDescription(active, data, 'eng')).toBe(
      'For 6s, SCORE Every 17s with a Low Probability chance. COND, ADD',
    )
    expect(composeActiveSkillDescription(active, data, 'ind')).toBe(
      'Selama 6 dtk, SCORE setiap 17 dtk dengan Peluang Rendah COND, ADD',
    )
    expect(composeActiveSkillDescription(active, data, 'cht')).toBe(
      '每 17 秒以低機率在 6 秒內SCORE CONDADD',
    )
    expect(composeSpecialSkillDescription(special, data, 'jpn')).toBe(
      '8秒間SPECIAL\nCONDADD',
    )
    expect(composeSpecialSkillDescription(special, data, 'ind')).toBe(
      'Selama 8 dtk, SPECIAL saat COND, ADD',
    )
    expect(composeSpecialSkillDescription(special, data, 'cht')).toBe(
      '在 8 秒內SPECIAL且CONDADD',
    )
    expect(
      composeSpecialSkillDescription(
        {
          ...specialSkill,
          additionalLiveActiveSkillEffectGroupId: 'additional',
        },
        data,
        'eng',
      ),
    ).toBe('For 8s, SPECIAL ADD')
  })

  it('returns null and reports unknown probabilities, malformed groups, and missing descriptions', () => {
    const data = createData()
    const onFailure = vi.fn()

    expect(
      composeActiveSkillDescription(
        { ...activeSkill, activationProbabilityPermilMultiply: 400 },
        data,
        'eng',
        onFailure,
      ),
    ).toBeNull()
    expect(onFailure).toHaveBeenCalledWith('卡片主動技能發動機率尚未確認')

    expect(
      composePassiveSkillDescription(
        {
          ...passiveSkill,
          additionalLiveSkillTriggerGroupId: 'passive-additional',
        },
        data,
        'jpn',
        onFailure,
      ),
    ).toBeNull()
    expect(
      composeSpecialSkillDescription(
        { ...specialSkill, additionalLiveActiveSkillEffectGroupId: 'missing' },
        data,
        'jpn',
        onFailure,
      ),
    ).toBeNull()

    const activeEffects = data.activeEffects.active!
    const multirowData = {
      ...data,
      activeEffects: {
        ...data.activeEffects,
        active: [...activeEffects, activeEffects[0]!],
      },
    }
    expect(
      composeActiveSkillDescription(
        activeSkill,
        multirowData,
        'eng',
        onFailure,
      ),
    ).toBeNull()
    expect(onFailure).toHaveBeenCalledTimes(4)
  })

  it('returns null and reports a multirow passive effect group', () => {
    const data = createData()
    const effects = data.effects.passive!
    const multirowData = {
      ...data,
      effects: { ...data.effects, passive: [...effects, effects[0]!] },
    }
    const onFailure = vi.fn()

    expect(
      composePassiveSkillDescription(
        passiveSkill,
        multirowData,
        'jpn',
        onFailure,
      ),
    ).toBeNull()
    expect(onFailure).toHaveBeenCalledWith(
      '卡片被動技能主要效果缺少資料或不是單列',
    )
  })
})
