import type {
  CardDetailGrowthData,
  CardGrowthSelection,
} from './card-detail.ts'
import type { CardStatKey } from './card-list-data.ts'

const statKeys: CardStatKey[] = ['performance', 'technique', 'sense']

export function calculateCardStats(
  weights: Record<CardStatKey, number>,
  baseValue: number,
  potentialBonus: number,
) {
  const base = Math.fround(baseValue)
  const bonus = Math.fround(potentialBonus)
  const multiplier = Math.fround(Math.fround(bonus / 1000) + 1)
  const stats = Object.fromEntries(
    statKeys.map((key) => {
      const basePermil = Math.fround(base / 1000)
      const weighted = Math.fround(basePermil * Math.fround(weights[key]))
      return [key, Math.ceil(Math.fround(weighted * multiplier))]
    }),
  ) as Record<CardStatKey, number>
  const highestWeight = Math.max(...statKeys.map((key) => weights[key]))
  return {
    stats,
    total: stats.performance + stats.technique + stats.sense,
    specializations: statKeys.filter((key) => weights[key] === highestWeight),
  }
}

export function getMaxCardGrowth(
  growth: CardDetailGrowthData,
): CardGrowthSelection {
  const limitBreakCount = Math.max(
    ...growth.levelLimits.map((row) => row.limitBreakCount),
  )
  const level = Math.max(
    ...growth.levelLimits
      .filter((row) => row.limitBreakCount === limitBreakCount)
      .map((row) => row.levelLimit),
  )
  return {
    level,
    limitBreakCount,
    potentialUpgradeCount: Math.max(
      0,
      ...growth.potentials.map((row) => row.upgradeCount),
    ),
  }
}

export function normalizeCardGrowthSelection(
  growth: CardDetailGrowthData,
  selection: CardGrowthSelection,
): CardGrowthSelection {
  const selectAtOrBelow = (values: number[], target: number) =>
    values.filter((value) => value <= target).sort((a, b) => b - a)[0] ??
    values[0]!
  const limitBreakCount = selectAtOrBelow(
    growth.levelLimits.map((row) => row.limitBreakCount),
    Math.floor(selection.limitBreakCount),
  )
  const maxLevel = Math.max(
    ...growth.levelLimits
      .filter((row) => row.limitBreakCount === limitBreakCount)
      .map((row) => row.levelLimit),
  )
  const level = selectAtOrBelow(
    growth.levels.map((row) => row.level).filter((value) => value <= maxLevel),
    Math.floor(selection.level),
  )
  const potentialUpgradeCount = selectAtOrBelow(
    [0, ...new Set(growth.potentials.map((row) => row.upgradeCount))],
    Math.floor(selection.potentialUpgradeCount),
  )
  return { level, limitBreakCount, potentialUpgradeCount }
}

export function selectCardGrowthLevel(
  growth: CardDetailGrowthData,
  selection: Pick<CardGrowthSelection, 'level' | 'potentialUpgradeCount'>,
): CardGrowthSelection {
  const normalized = normalizeCardGrowthSelection(growth, {
    ...selection,
    limitBreakCount: getMaxCardGrowth(growth).limitBreakCount,
  })
  const limitBreakCount = Math.min(
    ...growth.levelLimits
      .filter((row) => row.levelLimit >= normalized.level)
      .map((row) => row.limitBreakCount),
  )
  return { ...normalized, limitBreakCount }
}

export function calculateCardGrowth(
  growth: CardDetailGrowthData,
  selection: CardGrowthSelection,
) {
  const normalized = normalizeCardGrowthSelection(growth, selection)
  const level = growth.levels.find((row) => row.level === normalized.level)
  if (!level)
    throw new Error(`Missing CardLevel row for level ${normalized.level}`)
  const potentials = growth.potentials.filter(
    (row) => row.upgradeCount <= normalized.potentialUpgradeCount,
  )
  const bonus = potentials
    .filter((row) => row.effectType === 4)
    .reduce((sum, row) => sum + row.value, 0)
  const stats = calculateCardStats(
    growth.weightsPermil,
    level.parameterBaseValue,
    bonus,
  )
  const skillValue = (effectType: number) =>
    Math.max(
      1,
      ...potentials
        .filter((row) => row.effectType === effectType)
        .map((row) => row.value),
    )
  return {
    ...stats,
    skillLevels: {
      passiveSkill: skillValue(2),
      activeSkill: skillValue(1),
      specialSkill: skillValue(3),
      connectEffect: skillValue(5),
    },
  }
}
