import type { CardListPayload, CardListItemData } from './card-list-data.ts'

export interface CardDetailGrowthData {
  weightsPermil: Record<'performance' | 'technique' | 'sense', number>
  levels: { level: number; parameterBaseValue: number }[]
  levelLimits: { limitBreakCount: number; levelLimit: number }[]
  potentials: { upgradeCount: number; effectType: number; value: number }[]
}

export interface CardDetailPayload extends Omit<
  CardListPayload,
  'cards' | 'searchTextByCardId'
> {
  card: CardListItemData
  growth: CardDetailGrowthData
}

export interface CardDetailIndex {
  cardIds: string[]
}
export interface CardGrowthSelection {
  level: number
  limitBreakCount: number
  potentialUpgradeCount: number
}
