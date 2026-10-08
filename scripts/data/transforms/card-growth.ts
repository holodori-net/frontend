import type { DatabaseSync } from 'node:sqlite'
import type { TransformModule } from '../contract.ts'
import type { CardGrowthData } from '../../../shared/game-data/card-growth.ts'

export function transformCardGrowth(database: DatabaseSync): CardGrowthData {
  const levels = database
    .prepare(
      'SELECT group_id, level, parameter_base_value FROM CardLevel ORDER BY group_id, level',
    )
    .all() as {
    group_id: string
    level: number
    parameter_base_value: string | number
  }[]
  const levelLimits = database
    .prepare(
      'SELECT group_id, limit_break_count, level_limit FROM CardLevelLimit ORDER BY group_id, limit_break_count',
    )
    .all() as {
    group_id: string
    limit_break_count: number
    level_limit: number
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

  return {
    levels: groupRows(levels, (row) => ({
      level: row.level,
      parameterBaseValue: Number(row.parameter_base_value),
    })),
    levelLimits: groupRows(levelLimits, (row) => ({
      limitBreakCount: row.limit_break_count,
      levelLimit: row.level_limit,
    })),
    potentials: groupRows(potentials, (row) => ({
      upgradeCount: row.upgrade_count,
      effectType: row.effect_type,
      value: Number(row.value),
    })),
  }
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
      summary: `${Object.keys(data.levels).length} level groups, ${Object.keys(data.levelLimits).length} level limit groups, ${Object.keys(data.potentials).length} potential groups`,
    }
  },
}
