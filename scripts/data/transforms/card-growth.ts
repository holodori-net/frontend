import type { DatabaseSync } from 'node:sqlite'
import type { TransformModule } from '../contract.ts'
import { parseJsonArray } from '../common/json-array.ts'
import type { CardGrowthData } from '../../../shared/game-data/card-growth.ts'

export function transformCardGrowth(database: DatabaseSync): CardGrowthData {
  const levels = database
    .prepare(
      'SELECT group_id, level, parameter_base_value, exp, live_deck_power_permyriad_up FROM CardLevel ORDER BY group_id, level',
    )
    .all() as {
    group_id: string
    level: number
    parameter_base_value: string | number
    exp: string | number | null
    live_deck_power_permyriad_up: string | number | null
  }[]
  const levelLimits = database
    .prepare(
      'SELECT group_id, limit_break_count, level_limit, consumptions FROM CardLevelLimit ORDER BY group_id, limit_break_count',
    )
    .all() as {
    group_id: string
    limit_break_count: number
    level_limit: number
    consumptions: string | null
  }[]
  const potentials = database
    .prepare(
      'SELECT group_id, upgrade_count, effect_type, value FROM CardPotential ORDER BY group_id, upgrade_count, effect_type',
    )
    .all() as {
    group_id: string
    upgrade_count: number
    effect_type: number
    value: string | number
  }[]
  const potentialUpgradeItems = database
    .prepare(
      'SELECT rarity, item_id FROM CardPotentialUpgradeItem ORDER BY rarity',
    )
    .all() as {
    rarity: number | string
    item_id: string
  }[]

  return {
    levels: groupRows(levels, (row) => ({
      level: row.level,
      parameterBaseValue: Number(row.parameter_base_value),
      exp: row.exp === null ? null : Number(row.exp),
      liveDeckPowerPermyriadUp:
        row.live_deck_power_permyriad_up === null
          ? null
          : Number(row.live_deck_power_permyriad_up),
    })),
    levelLimits: groupRows(levelLimits, (row) => ({
      limitBreakCount: row.limit_break_count,
      levelLimit: row.level_limit,
      consumptions:
        row.consumptions === null
          ? null
          : parseJsonArray<ConsumptionSource>(row.consumptions, {
              table: 'CardLevelLimit',
              field: 'consumptions',
              rowId: `group_id=${row.group_id}, limit_break_count=${row.limit_break_count}`,
            }).map((consumption) => ({
              resourceType: consumption.resource_type.number,
              resourceId: consumption.resource_id,
              quantity: Number(consumption.quantity),
            })),
    })),
    potentials: groupRows(potentials, (row) => ({
      upgradeCount: row.upgrade_count,
      effectType: row.effect_type,
      value: Number(row.value),
    })),
    potentialUpgradeItems: Object.fromEntries(
      potentialUpgradeItems.map((row) => [
        String(row.rarity),
        { itemId: row.item_id },
      ]),
    ),
  }
}

interface ConsumptionSource {
  resource_type: { name: string; number: number }
  resource_id: string
  quantity: string | number
}

function groupRows<T extends { group_id: string }, Result>(
  rows: T[],
  map: (row: T) => Result,
): Record<string, Result[]> {
  const groups: Record<string, Result[]> = {}
  for (const row of rows) {
    ;(groups[row.group_id] ??= []).push(map(row))
  }
  return groups
}

export const cardGrowthTransform: TransformModule<CardGrowthData> = {
  fileName: 'card-growth.json',
  run(database) {
    const data = transformCardGrowth(database)
    return {
      data,
      summary: `${Object.keys(data.levels).length} level groups, ${Object.keys(data.levelLimits).length} level limit groups, ${Object.keys(data.potentials).length} potential groups, ${Object.keys(data.potentialUpgradeItems).length} potential upgrade item rows`,
    }
  },
}
