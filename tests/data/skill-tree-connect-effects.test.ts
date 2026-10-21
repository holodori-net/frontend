import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gameLocales } from '../../shared/language.ts'
import { createGameDatabase } from '../../server/data/database.ts'
import { transformSkillTreeConnectEffects } from '../../server/data/converters/skill-tree-connect-effects.ts'

describe('skill tree connect effect data transform', () => {
  let database: DatabaseSync

  beforeEach(() => {
    database = new DatabaseSync(':memory:')
    database.exec(`
      CREATE TABLE SkillTreeConnectEffect (
        id TEXT, level INTEGER, connect_effect_type INTEGER,
        skill_tree_connect_effect_extent_group_id TEXT, effect_permil_up TEXT,
        additional_skill_tree_effect_id TEXT, target_skill_tree_effect_id TEXT,
        target_node_type INTEGER, target_node_grade INTEGER, description_lang_id TEXT
      );
      CREATE TABLE SkillTreeConnectEffectExtent (
        group_id TEXT, position_x INTEGER, position_y INTEGER
      );
      CREATE TABLE LangGeneratedSkillTreeConnectEffect (
        language TEXT, id TEXT, text TEXT
      );
      INSERT INTO SkillTreeConnectEffect VALUES
        ('effect-b', 1, 2, 'extent-b', NULL, NULL, NULL, NULL, NULL, 'text-b'),
        ('effect-a', 2, 1, 'extent-a', '001600', 'additional-a', 'target-a', 3, 4, 'text-a-2'),
        ('effect-a', 1, 1, 'extent-a', '001100', NULL, 'target-a', NULL, 5, 'text-a-1');
      INSERT INTO SkillTreeConnectEffectExtent VALUES
        ('extent-a', 1, 0), ('extent-a', -1, 0), ('extent-a', 0, -1),
        ('extent-b', 4, 5);
    `)
    const insertTranslation = database.prepare(
      'INSERT INTO LangGeneratedSkillTreeConnectEffect VALUES (?, ?, ?)',
    )
    for (const id of ['text-a-1', 'text-a-2', 'text-b'])
      for (const locale of gameLocales)
        insertTranslation.run(locale, id, `${id}-${locale}`)
  })

  afterEach(() => database.close())

  it('groups and sorts effects and coordinates while retaining source values', () => {
    expect(
      transformSkillTreeConnectEffects(createGameDatabase(database)),
    ).toEqual({
      effects: {
        'effect-a': [
          {
            id: 'effect-a',
            level: 1,
            connectEffectType: 1,
            skillTreeConnectEffectExtentGroupId: 'extent-a',
            effectPermilUp: '001100',
            additionalSkillTreeEffectId: null,
            targetSkillTreeEffectId: 'target-a',
            targetNodeType: null,
            targetNodeGrade: 5,
            description: Object.fromEntries(
              gameLocales.map((locale) => [locale, `text-a-1-${locale}`]),
            ),
          },
          {
            id: 'effect-a',
            level: 2,
            connectEffectType: 1,
            skillTreeConnectEffectExtentGroupId: 'extent-a',
            effectPermilUp: '001600',
            additionalSkillTreeEffectId: 'additional-a',
            targetSkillTreeEffectId: 'target-a',
            targetNodeType: 3,
            targetNodeGrade: 4,
            description: Object.fromEntries(
              gameLocales.map((locale) => [locale, `text-a-2-${locale}`]),
            ),
          },
        ],
        'effect-b': [expect.objectContaining({ id: 'effect-b', level: 1 })],
      },
      extents: {
        'extent-a': [
          { x: 0, y: -1 },
          { x: -1, y: 0 },
          { x: 1, y: 0 },
        ],
        'extent-b': [{ x: 4, y: 5 }],
      },
    })
  })

  it('reports a missing extent with source field and effect level', () => {
    database.exec(
      "DELETE FROM SkillTreeConnectEffectExtent WHERE group_id = 'extent-a'",
    )
    expect(() =>
      transformSkillTreeConnectEffects(createGameDatabase(database)),
    ).toThrow(
      'SkillTreeConnectEffect.skill_tree_connect_effect_extent_group_id in row effect-a level=1',
    )
  })

  it('reports missing translations with source field and effect level', () => {
    database.exec(
      "DELETE FROM LangGeneratedSkillTreeConnectEffect WHERE id = 'text-a-2' AND language = 'ind'",
    )
    expect(() =>
      transformSkillTreeConnectEffects(createGameDatabase(database)),
    ).toThrow(
      'SkillTreeConnectEffect.description_lang_id in row effect-a level=2',
    )
  })
})
