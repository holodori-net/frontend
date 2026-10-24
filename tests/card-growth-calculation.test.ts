import { describe, expect, it } from 'vitest'
import type { CardDetailGrowthData } from '../shared/game-data/card-detail.ts'
import {
  calculateCardGrowth,
  getMaxCardGrowth,
  normalizeCardGrowthSelection,
  selectCardGrowthLevel,
} from '../shared/game-data/card-stats.ts'

const growth: CardDetailGrowthData = {
  weightsPermil: { performance: 400, technique: 306, sense: 294 },
  levels: [
    { level: 1, parameterBaseValue: 1000 },
    { level: 45, parameterBaseValue: 11000 },
    { level: 50, parameterBaseValue: 12000 },
    { level: 60, parameterBaseValue: 15412 },
  ],
  levelLimits: [
    { limitBreakCount: 0, levelLimit: 50 },
    { limitBreakCount: 1, levelLimit: 60 },
  ],
  potentials: [
    { upgradeCount: 2, effectType: 4, value: 50 },
    { upgradeCount: 5, effectType: 4, value: 100 },
    { upgradeCount: 3, effectType: 2, value: 2 },
    { upgradeCount: 4, effectType: 1, value: 3 },
    { upgradeCount: 6, effectType: 3, value: 2 },
    { upgradeCount: 7, effectType: 5, value: 4 },
  ],
}

describe('card growth calculation', () => {
  it('derives maximum available growth stages and clamps level to limit break', () => {
    expect(getMaxCardGrowth(growth)).toEqual({
      level: 60,
      limitBreakCount: 1,
      potentialUpgradeCount: 7,
    })
    expect(
      normalizeCardGrowthSelection(growth, {
        level: 80,
        limitBreakCount: 0,
        potentialUpgradeCount: 99,
      }),
    ).toEqual({ level: 50, limitBreakCount: 0, potentialUpgradeCount: 7 })
    expect(
      normalizeCardGrowthSelection(growth, {
        level: 45,
        limitBreakCount: 1,
        potentialUpgradeCount: 0,
      }),
    ).toEqual({ level: 45, limitBreakCount: 1, potentialUpgradeCount: 0 })
  })

  it('uses the lowest required training stage at and above each level cap', () => {
    const unordered = {
      ...growth,
      levelLimits: [...growth.levelLimits].reverse(),
    }
    expect(
      selectCardGrowthLevel(unordered, {
        level: 50,
        potentialUpgradeCount: 5,
      }),
    ).toEqual({ level: 50, limitBreakCount: 0, potentialUpgradeCount: 5 })
    expect(
      selectCardGrowthLevel(unordered, {
        level: 60,
        potentialUpgradeCount: 5,
      }),
    ).toEqual({ level: 60, limitBreakCount: 1, potentialUpgradeCount: 5 })
  })

  it('normalizes unavailable levels before deriving training and preserves Bloom', () => {
    expect(
      selectCardGrowthLevel(growth, {
        level: 55,
        potentialUpgradeCount: 5,
      }),
    ).toEqual({ level: 50, limitBreakCount: 0, potentialUpgradeCount: 5 })
    expect(
      selectCardGrowthLevel(growth, {
        level: 100,
        potentialUpgradeCount: 99,
      }),
    ).toEqual({ level: 60, limitBreakCount: 1, potentialUpgradeCount: 7 })
    expect(
      selectCardGrowthLevel(growth, {
        level: -10,
        potentialUpgradeCount: -1,
      }),
    ).toEqual({ level: 1, limitBreakCount: 0, potentialUpgradeCount: 0 })
  })

  it('matches the fully grown list stats and unlocks potential skills by stage', () => {
    expect(
      calculateCardGrowth(growth, {
        level: 60,
        limitBreakCount: 1,
        potentialUpgradeCount: 7,
      }),
    ).toEqual({
      stats: { performance: 7090, technique: 5424, sense: 5211 },
      total: 17725,
      specializations: ['performance'],
      skillLevels: {
        passiveSkill: 2,
        activeSkill: 3,
        specialSkill: 2,
        connectEffect: 4,
      },
    })
    expect(
      calculateCardGrowth(growth, {
        level: 1,
        limitBreakCount: 0,
        potentialUpgradeCount: 0,
      }),
    ).toEqual({
      stats: { performance: 400, technique: 306, sense: 294 },
      total: 1000,
      specializations: ['performance'],
      skillLevels: {
        passiveSkill: 1,
        activeSkill: 1,
        specialSkill: 1,
        connectEffect: 1,
      },
    })
  })

  it('preserves float32 rounding at integer boundaries', () => {
    const boundary = {
      ...growth,
      weightsPermil: { performance: 297, technique: 263, sense: 440 },
      levels: [{ level: 60, parameterBaseValue: 23512 }],
      potentials: [{ upgradeCount: 1, effectType: 4, value: 100 }],
    }
    expect(
      calculateCardGrowth(boundary, {
        level: 60,
        limitBreakCount: 1,
        potentialUpgradeCount: 1,
      }).stats,
    ).toEqual({ performance: 7682, technique: 6803, sense: 11380 })
  })
})
