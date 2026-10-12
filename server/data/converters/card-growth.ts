import { asc } from 'drizzle-orm'
import type { CardGrowthData } from '#shared/game-data/card-growth'
import type { GameDatabase } from '../database.ts'
import { parseJsonArray } from '../common/json-array.ts'
import {
  cardLevel,
  cardLevelLimit,
  cardPotential,
  cardPotentialUpgradeItem,
} from '../schema/card-growth.ts'

export function transformCardGrowth(database: GameDatabase): CardGrowthData {
  const levels = database
    .select({
      groupId: cardLevel.groupId,
      level: cardLevel.level,
      parameterBaseValue: cardLevel.parameterBaseValue,
      exp: cardLevel.exp,
      liveDeckPowerPermyriadUp: cardLevel.liveDeckPowerPermyriadUp,
    })
    .from(cardLevel)
    .orderBy(asc(cardLevel.groupId), asc(cardLevel.level))
    .all()
  const levelLimits = database
    .select({
      groupId: cardLevelLimit.groupId,
      limitBreakCount: cardLevelLimit.limitBreakCount,
      levelLimit: cardLevelLimit.levelLimit,
      consumptions: cardLevelLimit.consumptions,
    })
    .from(cardLevelLimit)
    .orderBy(asc(cardLevelLimit.groupId), asc(cardLevelLimit.limitBreakCount))
    .all()
  const potentials = database
    .select({
      groupId: cardPotential.groupId,
      upgradeCount: cardPotential.upgradeCount,
      effectType: cardPotential.effectType,
      value: cardPotential.value,
    })
    .from(cardPotential)
    .orderBy(
      asc(cardPotential.groupId),
      asc(cardPotential.upgradeCount),
      asc(cardPotential.effectType),
    )
    .all()
  const potentialUpgradeItems = database
    .select({
      rarity: cardPotentialUpgradeItem.rarity,
      itemId: cardPotentialUpgradeItem.itemId,
    })
    .from(cardPotentialUpgradeItem)
    .orderBy(asc(cardPotentialUpgradeItem.rarity))
    .all()

  return {
    levels: groupRows(levels, (row) => ({
      level: row.level,
      parameterBaseValue: Number(row.parameterBaseValue),
      exp: row.exp === null ? null : Number(row.exp),
      liveDeckPowerPermyriadUp:
        row.liveDeckPowerPermyriadUp === null
          ? null
          : Number(row.liveDeckPowerPermyriadUp),
    })),
    levelLimits: groupRows(levelLimits, (row) => ({
      limitBreakCount: row.limitBreakCount,
      levelLimit: row.levelLimit,
      consumptions:
        row.consumptions === null
          ? null
          : parseJsonArray<ConsumptionSource>(row.consumptions, {
              table: 'CardLevelLimit',
              field: 'consumptions',
              rowId: `group_id=${row.groupId}, limit_break_count=${row.limitBreakCount}`,
            }).map((consumption) => ({
              resourceType: consumption.resource_type.number,
              resourceId: consumption.resource_id,
              quantity: Number(consumption.quantity),
            })),
    })),
    potentials: groupRows(potentials, (row) => ({
      upgradeCount: row.upgradeCount,
      effectType: row.effectType,
      value: Number(row.value),
    })),
    potentialUpgradeItems: Object.fromEntries(
      potentialUpgradeItems.map((row) => [
        String(row.rarity),
        { itemId: row.itemId },
      ]),
    ),
  }
}

interface ConsumptionSource {
  resource_type: { name: string; number: number }
  resource_id: string
  quantity: string | number
}

function groupRows<T extends { groupId: string }, Result>(
  rows: T[],
  map: (row: T) => Result,
): Record<string, Result[]> {
  const groups: Record<string, Result[]> = {}
  for (const row of rows) {
    ;(groups[row.groupId] ??= []).push(map(row))
  }
  return groups
}
