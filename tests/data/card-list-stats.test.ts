import { describe, expect, it } from 'vitest'
import type { CardData } from '../../shared/game-data/cards.ts'
import type { CardGrowthData } from '../../shared/game-data/card-growth.ts'
import type { LocalizedNames } from '../../shared/game-data/localized-text.ts'
import { calculateCardListStats } from '../../server/data/card-list-stats.ts'

const names: LocalizedNames = {
  jpn: '名前',
  eng: 'Name',
  ind: 'Nama',
  kor: '이름',
  cht: '名稱',
  chs: '名称',
}

function card(
  rarity: number,
  baseWeights: CardData['growth']['weightsPermil'],
): CardData {
  return {
    id: `card-${rarity}`,
    characterId: 'chr-00015',
    rewardCostumeId: null,
    livePassiveSkillId: 'passive-1',
    liveActiveSkillId: 'active-1',
    liveSpecialSkillId: 'special-1',
    skillTreeConnectEffectId: null,
    name: names,
    rarity,
    attributeType: 1,
    assetId: null,
    assetType: 0,
    verticalAnchorType: 0,
    horizontalAnchorType: 0,
    order: 1,
    growth: {
      levelGroupId: 'levels',
      levelLimitGroupId: 'limits',
      potentialGroupId: `potential-${rarity}`,
      weightsPermil: baseWeights,
    },
  }
}

function growth(potentialGroupId: string, values: number[]): CardGrowthData {
  return {
    levels: {},
    levelLimits: {},
    potentials: {
      [potentialGroupId]: values.map((value, index) => ({
        upgradeCount: index + 1,
        effectType: 4,
        value,
      })),
    },
    potentialUpgradeItems: {},
  }
}

describe('card list stat calculation', () => {
  it('calculates max-grown Sakura Miko three-star parameters with all potential bonuses', () => {
    expect(
      calculateCardListStats(
        card(3, { performance: 400, technique: 306, sense: 294 }),
        15412,
        growth('potential-3', [50, 100]),
      ),
    ).toEqual({
      stats: { performance: 7090, technique: 5424, sense: 5211 },
      total: 17725,
      specializations: ['performance'],
    })
  })

  it('calculates max-grown Sakura Miko five-star parameters', () => {
    expect(
      calculateCardListStats(
        card(5, { performance: 297, technique: 263, sense: 440 }),
        23512,
        growth('potential-5', [100]),
      ),
    ).toEqual({
      stats: { performance: 7682, technique: 6803, sense: 11380 },
      total: 25865,
      specializations: ['sense'],
    })
  })

  it('keeps every stat tied for the highest weight', () => {
    expect(
      calculateCardListStats(
        card(3, { performance: 300, technique: 300, sense: 300 }),
        1000,
        growth('potential-3', []),
      ).specializations,
    ).toEqual(['performance', 'technique', 'sense'])
  })

  it('uses original weights when low values tie after rounding', () => {
    expect(
      calculateCardListStats(
        card(3, { performance: 400, technique: 399, sense: 201 }),
        1,
        growth('potential-3', []),
      ),
    ).toEqual({
      stats: { performance: 1, technique: 1, sense: 1 },
      total: 3,
      specializations: ['performance'],
    })
  })

  it('preserves float32 rounding at an integer boundary', () => {
    const result = calculateCardListStats(
      card(4, { performance: 297, technique: 263, sense: 440 }),
      10000,
      growth('potential-4', [100]),
    )
    expect(result.stats).toEqual({
      performance: 3267,
      technique: 2893,
      sense: 4840,
    })
    expect(result.total).toBe(11000)
  })

  it('excludes skill level effects from stat bonuses', () => {
    const source = growth('potential-3', [50, 100])
    source.potentials['potential-3']!.push({
      upgradeCount: 4,
      effectType: 2,
      value: 2,
    })
    expect(
      calculateCardListStats(
        card(3, { performance: 400, technique: 306, sense: 294 }),
        15412,
        source,
      ).total,
    ).toBe(17725)
  })
})
