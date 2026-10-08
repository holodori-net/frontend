import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { transformCardGrowth } from '../../scripts/data/transforms/card-growth.ts'

describe('card growth data transform', () => {
  let database: DatabaseSync

  beforeEach(() => {
    database = new DatabaseSync(':memory:')
    database.exec(`
      CREATE TABLE CardLevel (group_id TEXT, level INTEGER, parameter_base_value TEXT);
      CREATE TABLE CardLevelLimit (group_id TEXT, limit_break_count INTEGER, level_limit INTEGER);
      CREATE TABLE CardPotential (group_id TEXT, upgrade_count INTEGER, effect_type INTEGER, value TEXT);
      INSERT INTO CardLevel VALUES ('unused-levels', 2, '125'), ('shared', 2, '2025'), ('shared', 1, '105');
      INSERT INTO CardLevelLimit VALUES ('unused-limits', 0, 10), ('limits', 0, 20), ('limits', 2, 60);
      INSERT INTO CardPotential VALUES ('unused-potential', 0, 9, '125'), ('potential', 0, 2, '0'),
        ('potential', 1, 1, '350'), ('potential', 1, 0, '250');
    `)
  })

  afterEach(() => database.close())

  it('keeps unused groups, parses numeric text, and sorts by group and stage', () => {
    expect(transformCardGrowth(database)).toEqual({
      levels: {
        shared: [
          { level: 1, parameterBaseValue: 105 },
          { level: 2, parameterBaseValue: 2025 },
        ],
        'unused-levels': [{ level: 2, parameterBaseValue: 125 }],
      },
      levelLimits: {
        limits: [
          { limitBreakCount: 0, levelLimit: 20 },
          { limitBreakCount: 2, levelLimit: 60 },
        ],
        'unused-limits': [{ limitBreakCount: 0, levelLimit: 10 }],
      },
      potentials: {
        potential: [
          { upgradeCount: 0, effectType: 2, value: 0 },
          { upgradeCount: 1, effectType: 0, value: 250 },
          { upgradeCount: 1, effectType: 1, value: 350 },
        ],
        'unused-potential': [{ upgradeCount: 0, effectType: 9, value: 125 }],
      },
    })
  })
})
