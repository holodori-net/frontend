import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gameLocales, type GameLocale } from '../../shared/language.ts'
import type {
  LiveLeaderSkillData,
  LivePassiveSkillEffectData,
  LiveSkillData,
  LiveSkillTargetData,
  LiveSkillTriggerData,
  SkillDescription,
} from '../../shared/game-data/live-skills.ts'
import {
  composeCostumeSkillDescription,
  renderSkillDescription,
} from '../../shared/game-data/live-skill-description.ts'

const localized = (text: string) =>
  Object.fromEntries(gameLocales.map((locale) => [locale, text])) as Record<
    GameLocale,
    string
  >

function createData(): LiveSkillData {
  return {
    costumes: [],
    leaderSkills: [],
    effects: {},
    triggers: {},
    targets: [],
    catalog: {
      templates: {},
      labels: { character: {}, group: {}, attribute: {}, judgement: {} },
    },
    pendingDescriptions: [],
  }
}

function description(
  templateId: string,
  params: SkillDescription['params'] = {},
): SkillDescription {
  return { templateId, params }
}

function effect(
  groupId: string,
  effectDescription: SkillDescription | null = description(`effect-${groupId}`),
): LivePassiveSkillEffectData {
  return {
    groupId,
    number: 1,
    type: 8,
    value: '100',
    liveSkillEffectTargetId: null,
    resourceType: null,
    resourceIds: [],
    description: effectDescription,
  }
}

function trigger(
  groupId: string,
  triggerDescription: SkillDescription | null = description(
    `trigger-${groupId}`,
  ),
): LiveSkillTriggerData {
  return {
    groupId,
    number: 1,
    type: 7,
    threshold: '3',
    characterIds: [],
    characterGroupingId: null,
    musicId: null,
    cardAttributeType: null,
    liveNoteJudgementType: null,
    description: triggerDescription,
  }
}

function costumeSkill(
  overrides: Partial<LiveLeaderSkillData> = {},
): LiveLeaderSkillData {
  return {
    id: 'skill-1',
    liveSkillTriggerGroupId: 'main-trigger',
    livePassiveSkillEffectGroupId: 'main-effect',
    additionalLiveSkillTriggerGroupId: null,
    additionalLivePassiveSkillEffectGroupId: null,
    ...overrides,
  }
}

function setDescriptions(data: LiveSkillData) {
  const textByTemplate: Record<string, string> = {
    'effect-main-effect': 'MAIN EFFECT',
    'trigger-main-trigger': 'MAIN TRIGGER',
    'effect-add-effect': 'ADD EFFECT',
    'trigger-add-trigger': 'ADD TRIGGER',
  }
  for (const [templateId, text] of Object.entries(textByTemplate)) {
    data.catalog.templates[templateId] = {
      domain: templateId.startsWith('effect') ? 'effect' : 'trigger',
      type: templateId.startsWith('effect') ? 8 : 7,
      parameters: [],
      text: localized(text),
    }
  }
  for (const groupId of ['main-effect', 'add-effect']) {
    data.effects[groupId] = [effect(groupId, description(`effect-${groupId}`))]
  }
  for (const groupId of ['main-trigger', 'add-trigger']) {
    data.triggers[groupId] = [
      trigger(groupId, description(`trigger-${groupId}`)),
    ]
  }
}

describe('renderSkillDescription', () => {
  it('renders named values once from the source template and preserves inserted markup and placeholders', () => {
    const data = createData()
    data.catalog.templates.effect = {
      domain: 'effect',
      type: 8,
      parameters: ['name', 'percent'],
      text: localized('{name} gains {percent}% [attribute=2]'),
    }
    data.catalog.labels.group.group1 = localized('{percent} [attribute=1]')

    expect(
      renderSkillDescription(
        description('effect', {
          name: { kind: 'group', id: 'group1' },
          percent: 15,
        }),
        data,
        'cht',
      ),
    ).toBe('{percent} [attribute=1] gains 15% [attribute=2]')
  })

  it('recursively renders target descriptions and returns null for missing data or cycles', () => {
    const data = createData()
    data.catalog.templates.effect = {
      domain: 'effect',
      type: 8,
      parameters: ['target'],
      text: localized('{target} up'),
    }
    data.catalog.templates.target = {
      domain: 'target',
      type: 2,
      parameters: [],
      text: localized('all members'),
    }
    const target: LiveSkillTargetData = {
      id: 'target-1',
      type: 2,
      targetCount: null,
      characterId: null,
      characterGroupingId: null,
      cardAttributeType: null,
      description: description('target'),
    }
    data.targets.push(target)

    expect(
      renderSkillDescription(
        description('effect', { target: { kind: 'target', id: 'target-1' } }),
        data,
        'eng',
      ),
    ).toBe('all members up')
    expect(
      renderSkillDescription(
        description('effect', { target: { kind: 'target', id: 'missing' } }),
        data,
        'eng',
      ),
    ).toBeNull()

    target.description = description('effect', {
      target: { kind: 'target', id: 'target-1' },
    })
    expect(
      renderSkillDescription(
        description('effect', { target: { kind: 'target', id: 'target-1' } }),
        data,
        'eng',
      ),
    ).toBeNull()
  })

  it('returns null when a template, required parameter, or localized label is missing', () => {
    const data = createData()
    data.catalog.templates.effect = {
      domain: 'effect',
      type: 8,
      parameters: ['name'],
      text: localized('{name}'),
    }
    expect(
      renderSkillDescription(description('missing'), data, 'jpn'),
    ).toBeNull()
    expect(
      renderSkillDescription(description('effect'), data, 'jpn'),
    ).toBeNull()
    expect(
      renderSkillDescription(
        description('effect', { name: { kind: 'character', id: 'missing' } }),
        data,
        'jpn',
      ),
    ).toBeNull()
  })

  it('leaves non-parameter brace text unchanged', () => {
    const data = createData()
    data.catalog.templates.effect = {
      domain: 'effect',
      type: 8,
      parameters: [],
      text: localized('Keep {x-y} as written'),
    }

    expect(renderSkillDescription(description('effect'), data, 'eng')).toBe(
      'Keep {x-y} as written',
    )
  })
})

describe('composeCostumeSkillDescription', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })
  afterEach(() => vi.restoreAllMocks())

  it.each([
    ['jpn', 'MAIN TRIGGER、MAIN EFFECT、ADD TRIGGER、ADD EFFECT'],
    ['cht', 'MAIN TRIGGER，MAIN EFFECT、ADD TRIGGER，ADD EFFECT'],
    ['chs', 'MAIN TRIGGER，MAIN EFFECT、ADD TRIGGER，ADD EFFECT'],
    ['eng', 'MAIN TRIGGER, MAIN EFFECT; ADD TRIGGER, ADD EFFECT'],
    ['kor', 'MAIN TRIGGER, MAIN EFFECT; ADD TRIGGER, ADD EFFECT'],
    ['ind', 'Saat MAIN TRIGGER, MAIN EFFECT; Saat ADD TRIGGER, ADD EFFECT'],
  ] as const)(
    'composes both independent segments in %s',
    (locale, expected) => {
      const data = createData()
      setDescriptions(data)
      const result = composeCostumeSkillDescription(
        costumeSkill({
          additionalLiveSkillTriggerGroupId: 'add-trigger',
          additionalLivePassiveSkillEffectGroupId: 'add-effect',
        }),
        data,
        locale,
      )
      expect(result).toBe(expected)
      expect(data.pendingDescriptions).toEqual([])
    },
  )

  it.each(gameLocales)('composes an unconditional effect in %s', (locale) => {
    const data = createData()
    setDescriptions(data)
    data.catalog.templates['effect-main-effect']!.text =
      localized(' MAIN EFFECT ')
    data.catalog.templates['effect-add-effect']!.text =
      localized(' ADD EFFECT ')
    const result = composeCostumeSkillDescription(
      costumeSkill({
        liveSkillTriggerGroupId: null,
        additionalLiveSkillTriggerGroupId: null,
        additionalLivePassiveSkillEffectGroupId: 'add-effect',
      }),
      data,
      locale,
    )
    const expected =
      locale === 'jpn' || locale === 'cht' || locale === 'chs'
        ? 'MAIN EFFECT、ADD EFFECT'
        : 'MAIN EFFECT; ADD EFFECT'
    expect(result).toBe(expected)
  })

  it('returns null without mutating data or logging for an incomplete skill', () => {
    const data = createData()
    setDescriptions(data)
    const skill = costumeSkill({
      additionalLiveSkillTriggerGroupId: 'add-trigger',
    })
    const before = JSON.stringify(data)

    expect(composeCostumeSkillDescription(skill, data, 'eng')).toBeNull()
    expect(JSON.stringify(data)).toBe(before)
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('reports an incomplete skill through the supplied callback', () => {
    const data = createData()
    setDescriptions(data)
    const report = vi.fn()
    const skill = costumeSkill({
      additionalLiveSkillTriggerGroupId: 'add-trigger',
    })

    expect(
      composeCostumeSkillDescription(skill, data, 'eng', report),
    ).toBeNull()
    expect(report).toHaveBeenCalledWith('附加條件存在但沒有附加效果')
    expect(data.pendingDescriptions).toEqual([])
  })

  it('reports multi-row effects through the supplied callback', () => {
    const data = createData()
    setDescriptions(data)
    data.effects['main-effect']!.push({
      ...effect('main-effect'),
      number: 2,
    })
    const report = vi.fn()

    expect(
      composeCostumeSkillDescription(costumeSkill(), data, 'cht', report),
    ).toBeNull()
    expect(report).toHaveBeenCalledWith('主要效果必須恰有一列')
    expect(data.pendingDescriptions).toEqual([])
  })

  it('trims segment boundaries and avoids duplicate punctuation', () => {
    const data = createData()
    setDescriptions(data)
    data.catalog.templates['effect-main-effect']!.text = localized(
      ' MAIN [attribute=1] ',
    )
    data.catalog.templates['trigger-main-trigger']!.text = localized(' 条件 ')

    expect(composeCostumeSkillDescription(costumeSkill(), data, 'eng')).toBe(
      '条件, MAIN [attribute=1]',
    )
  })

  it.each([
    ['jpn', 'MAIN TRIGGER、MAIN EFFECT'],
    ['cht', 'MAIN TRIGGER，MAIN EFFECT'],
    ['chs', 'MAIN TRIGGER，MAIN EFFECT'],
    ['eng', 'MAIN TRIGGER, MAIN EFFECT'],
    ['kor', 'MAIN TRIGGER, MAIN EFFECT'],
    ['ind', 'Saat MAIN TRIGGER, MAIN EFFECT'],
  ] as const)(
    'formats condition/effect punctuation in %s',
    (locale, expected) => {
      const data = createData()
      setDescriptions(data)
      data.catalog.templates['trigger-main-trigger']!.text =
        localized(' MAIN TRIGGER , , ')
      data.catalog.templates['effect-main-effect']!.text =
        localized(' ; ; MAIN EFFECT ')

      expect(composeCostumeSkillDescription(costumeSkill(), data, locale)).toBe(
        expected,
      )
    },
  )

  it('reports multi-row triggers through the supplied callback', () => {
    const data = createData()
    setDescriptions(data)
    data.triggers['main-trigger']!.push({
      ...trigger('main-trigger'),
      number: 2,
    })
    const report = vi.fn()

    expect(
      composeCostumeSkillDescription(costumeSkill(), data, 'eng', report),
    ).toBeNull()
    expect(report).toHaveBeenCalledWith('主要條件缺少資料或不是單列')
    expect(data.pendingDescriptions).toEqual([])
  })
})
