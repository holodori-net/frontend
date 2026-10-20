import { describe, expect, it } from 'vitest'
import type { LiveSkillData } from '../../shared/game-data/live-skills.ts'
import {
  costumeIdsForCards,
  projectCardListSkills,
} from '../../server/data/card-list-skills.ts'

const text = {
  jpn: 'JP',
  eng: 'EN',
  ind: 'ID',
  kor: 'KO',
  cht: '繁',
  chs: '简',
}

function data(): LiveSkillData {
  const description = {
    templateId: 'effect:1',
    params: {
      target: { kind: 'target' as const, id: 'target-1' },
      character: { kind: 'character' as const, id: 'chr-1' },
      unused: { kind: 'target' as const, id: 'missing-unused-target' },
    },
  }
  return {
    costumes: [
      {
        id: 'costume-1',
        characterId: 'chr-1',
        name: text,
        liveLeaderSkillId: 'skill-1',
      },
      {
        id: 'unrelated',
        characterId: 'chr-2',
        name: text,
        liveLeaderSkillId: null,
      },
    ],
    leaderSkills: [
      {
        id: 'skill-1',
        liveSkillTriggerGroupId: null,
        livePassiveSkillEffectGroupId: 'effect-group',
        additionalLiveSkillTriggerGroupId: null,
        additionalLivePassiveSkillEffectGroupId: null,
      },
      {
        id: 'unused-skill',
        liveSkillTriggerGroupId: null,
        livePassiveSkillEffectGroupId: 'unused-group',
        additionalLiveSkillTriggerGroupId: null,
        additionalLivePassiveSkillEffectGroupId: null,
      },
    ],
    effects: {
      'effect-group': [
        {
          groupId: 'effect-group',
          number: 1,
          type: 1,
          value: null,
          liveSkillEffectTargetId: null,
          resourceType: null,
          resourceIds: null,
          description,
        },
      ],
      'unused-group': [
        {
          groupId: 'unused-group',
          number: 1,
          type: 1,
          value: null,
          liveSkillEffectTargetId: null,
          resourceType: null,
          resourceIds: null,
          description: null,
        },
      ],
    },
    triggers: {},
    targets: [
      {
        id: 'target-1',
        type: 4,
        targetCount: 2,
        characterId: null,
        characterGroupingId: 'group-1',
        cardAttributeType: null,
        description: {
          templateId: 'target:2',
          params: { group: { kind: 'group', id: 'group-1' } },
        },
      },
      {
        id: 'unused-target',
        type: 0,
        targetCount: null,
        characterId: null,
        characterGroupingId: null,
        cardAttributeType: null,
        description: null,
      },
    ],
    catalog: {
      templates: {
        'effect:1': {
          domain: 'effect',
          type: 1,
          parameters: ['target', 'character'],
          text,
        },
        'target:2': { domain: 'target', type: 2, parameters: ['group'], text },
        unused: { domain: 'trigger', type: 9, parameters: [], text },
      },
      labels: {
        character: { 'chr-1': text, 'unused-character': text },
        group: { 'group-1': text, 'unused-group': text },
        attribute: {},
        judgement: {},
      },
    },
    pendingDescriptions: [
      {
        table: 'irrelevant',
        key: 'x',
        type: null,
        language: null,
        reason: 'exclude',
      },
    ],
  }
}

describe('projectCardListSkills', () => {
  it('uses a reward costume when present and otherwise uses the character default', () => {
    const selected = costumeIdsForCards(
      [
        { id: 'card-1', characterId: 'chr-1', rewardCostumeId: 'reward' },
        { id: 'card-2', characterId: 'chr-1', rewardCostumeId: null },
      ],
      [{ id: 'chr-1', defaultCostumeId: 'default' }],
      [
        {
          id: 'reward',
          characterId: 'chr-1',
          name: text,
          liveLeaderSkillId: null,
        },
        {
          id: 'default',
          characterId: 'chr-1',
          name: text,
          liveLeaderSkillId: null,
        },
      ],
    )
    expect(selected).toEqual(
      new Map([
        ['card-1', 'reward'],
        ['card-2', 'default'],
      ]),
    )
  })

  it('validates costume ownership and declared leader skill references', () => {
    expect(() =>
      costumeIdsForCards(
        [{ id: 'card-1', characterId: 'chr-1', rewardCostumeId: null }],
        [{ id: 'chr-1', defaultCostumeId: 'costume-1' }],
        [
          {
            id: 'costume-1',
            characterId: 'chr-2',
            name: text,
            liveLeaderSkillId: null,
          },
        ],
      ),
    ).toThrow(
      'Card card-1 references Costume costume-1 for Character chr-2, expected chr-1',
    )

    const source = data()
    source.costumes[0]!.liveLeaderSkillId = 'missing-skill'
    expect(() => projectCardListSkills(source, new Set(['costume-1']))).toThrow(
      'Missing LiveLeaderSkill missing-skill referenced by Costume.live_leader_skill_id in row costume-1',
    )
  })

  it('keeps only reachable costumes, skills, groups, targets, templates, and labels', () => {
    const result = projectCardListSkills(data(), new Set(['costume-1']))

    expect(result.costumes).toEqual({
      'costume-1': { name: text, leaderSkillId: 'skill-1' },
    })
    expect(Object.keys(result.skills.leaderSkills)).toEqual(['skill-1'])
    expect(result.skills.effects).toEqual({
      'effect-group': [
        { description: data().effects['effect-group']![0]!.description },
      ],
    })
    expect(result.skills.targets.map(({ id }) => id)).toEqual(['target-1'])
    expect(Object.keys(result.skills.catalog.templates).sort()).toEqual([
      'effect:1',
      'target:2',
    ])
    expect(result.skills.catalog.labels.character).toEqual({ 'chr-1': text })
    expect(result.skills.catalog.labels.group).toEqual({ 'group-1': text })
    expect('pendingDescriptions' in result.skills).toBe(false)
  })

  it('retains null descriptions while projecting a skill group', () => {
    const source = data()
    source.effects['effect-group']![0]!.description = null
    const result = projectCardListSkills(source, new Set(['costume-1']))
    expect(result.skills.effects['effect-group']).toEqual([
      { description: null },
    ])
    expect(result.skills.targets).toEqual([])
    expect(result.skills.catalog.templates).toEqual({})
  })

  it('walks recursive target references and safely stops at cycles', () => {
    const source = data()
    source.targets[0]!.description = {
      templateId: 'target:chain',
      params: { next: { kind: 'target', id: 'target-2' } },
    }
    source.targets.push({
      id: 'target-2',
      type: 2,
      targetCount: null,
      characterId: null,
      characterGroupingId: null,
      cardAttributeType: null,
      description: {
        templateId: 'target:back',
        params: { next: { kind: 'target', id: 'target-1' } },
      },
    })
    source.catalog.templates['target:chain'] = {
      domain: 'target',
      type: 1,
      parameters: ['next'],
      text,
    }
    source.catalog.templates['target:back'] = {
      domain: 'target',
      type: 2,
      parameters: ['next'],
      text,
    }

    const result = projectCardListSkills(source, new Set(['costume-1']))
    expect(result.skills.targets.map(({ id }) => id)).toEqual([
      'target-1',
      'target-2',
    ])
    expect(result.skills.catalog.templates).toHaveProperty('target:chain')
    expect(result.skills.catalog.templates).toHaveProperty('target:back')
  })

  it('fails with the source reference when a declared template or label is missing', () => {
    const missingTemplate = data()
    missingTemplate.effects['effect-group']![0]!.description!.templateId =
      'missing-template'
    expect(() =>
      projectCardListSkills(missingTemplate, new Set(['costume-1'])),
    ).toThrow(
      'LivePassiveSkillEffect effect-group:1 references missing description template missing-template',
    )

    const missingLabel = data()
    delete missingLabel.catalog.labels.character['chr-1']
    expect(() =>
      projectCardListSkills(missingLabel, new Set(['costume-1'])),
    ).toThrow(
      'LivePassiveSkillEffect effect-group:1 references missing character label chr-1',
    )
  })

  it('fails with context when a selected costume is missing', () => {
    expect(() => projectCardListSkills(data(), new Set(['missing']))).toThrow(
      'Missing Costume missing referenced by Card or Character',
    )
  })
})
