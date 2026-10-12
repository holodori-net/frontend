import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { transformCardGrowth } from '../../server/data/converters/card-growth.ts'

describe('card growth data transform', () => {
  let database: DatabaseSync

  beforeEach(() => {
    database = new DatabaseSync(':memory:')
    database.exec(`
      CREATE TABLE CardLevel (group_id TEXT, level INTEGER, parameter_base_value TEXT, exp TEXT, live_deck_power_permyriad_up TEXT);
      CREATE TABLE CardLevelLimit (group_id TEXT, limit_break_count INTEGER, level_limit INTEGER, consumptions TEXT);
      CREATE TABLE CardPotential (group_id TEXT, upgrade_count INTEGER, effect_type INTEGER, value TEXT);
      CREATE TABLE CardPotentialUpgradeItem (rarity INTEGER, item_id TEXT);
      INSERT INTO CardLevel VALUES
        ('unused-levels', 2, '125', NULL, '0'),
        ('shared', 2, '2025', '0', '5'),
        ('shared', 1, '105', '40', NULL);
      INSERT INTO CardLevelLimit VALUES
        ('unused-limits', 0, 10, NULL),
        ('limits', 0, 20, '[]'),
        ('limits', 2, 60, '[{"resource_type":{"name":"RESOURCE_TYPE_UNKNOWN","number":73},"resource_id":"resource-later","quantity":"20"},{"resource_type":{"name":"RESOURCE_TYPE_ITEM","number":3},"resource_id":"resource-first","quantity":"0"}]');
      INSERT INTO CardPotential VALUES ('unused-potential', 0, 9, '125'), ('potential', 0, 2, '0'),
        ('potential', 1, 1, '350'), ('potential', 1, 0, '250');
      INSERT INTO CardPotentialUpgradeItem VALUES (5, 'item-card-potential-upgrade-cmn'), (4, 'item-upgrade-rarity-4'), (3, 'item-upgrade-rarity-3');
    `)
  })

  afterEach(() => database.close())

  it('keeps unused groups, parses numeric text, and sorts by group and stage', () => {
    expect(transformCardGrowth(database)).toEqual({
      levels: {
        shared: [
          {
            level: 1,
            parameterBaseValue: 105,
            exp: 40,
            liveDeckPowerPermyriadUp: null,
          },
          {
            level: 2,
            parameterBaseValue: 2025,
            exp: 0,
            liveDeckPowerPermyriadUp: 5,
          },
        ],
        'unused-levels': [
          {
            level: 2,
            parameterBaseValue: 125,
            exp: null,
            liveDeckPowerPermyriadUp: 0,
          },
        ],
      },
      levelLimits: {
        limits: [
          { limitBreakCount: 0, levelLimit: 20, consumptions: [] },
          {
            limitBreakCount: 2,
            levelLimit: 60,
            consumptions: [
              {
                resourceType: 73,
                resourceId: 'resource-later',
                quantity: 20,
              },
              { resourceType: 3, resourceId: 'resource-first', quantity: 0 },
            ],
          },
        ],
        'unused-limits': [
          { limitBreakCount: 0, levelLimit: 10, consumptions: null },
        ],
      },
      potentials: {
        potential: [
          { upgradeCount: 0, effectType: 2, value: 0 },
          { upgradeCount: 1, effectType: 0, value: 250 },
          { upgradeCount: 1, effectType: 1, value: 350 },
        ],
        'unused-potential': [{ upgradeCount: 0, effectType: 9, value: 125 }],
      },
      potentialUpgradeItems: {
        '3': { itemId: 'item-upgrade-rarity-3' },
        '4': { itemId: 'item-upgrade-rarity-4' },
        '5': { itemId: 'item-card-potential-upgrade-cmn' },
      },
    })
  })

  it('returns an empty potential upgrade item dictionary when the source has no rows', () => {
    database.exec('DELETE FROM CardPotentialUpgradeItem')
    expect(transformCardGrowth(database).potentialUpgradeItems).toEqual({})
  })

  it('includes the source row identity and parse cause for malformed consumptions JSON', () => {
    database.exec(`
      INSERT INTO CardLevelLimit VALUES ('bad-group', 3, 80, '{not json');
    `)

    let error: unknown
    try {
      transformCardGrowth(database)
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('CardLevelLimit.consumptions')
    expect((error as Error).message).toContain(
      'group_id=bad-group, limit_break_count=3',
    )
    expect((error as Error & { cause?: unknown }).cause).toBeInstanceOf(
      SyntaxError,
    )
  })
})
