import type {
  CardListPayload,
  CardListItemData,
  CardListCostumeData,
} from './card-list-data.ts'
import type { CardData } from './cards.ts'
import type { CharacterGroupData } from './character-groups.ts'

export interface CardDetailCostumeData extends CardListCostumeData {
  assetId: string
}

export interface CardDetailGrowthData {
  weightsPermil: Record<'performance' | 'technique' | 'sense', number>
  levels: { level: number; parameterBaseValue: number }[]
  levelLimits: { limitBreakCount: number; levelLimit: number }[]
  potentials: { upgradeCount: number; effectType: number; value: number }[]
}

export interface CardDetailPayload extends Omit<
  CardListPayload,
  'cards' | 'searchTextByCardId' | 'costumes'
> {
  card: CardListItemData & Pick<CardData, 'assetType'>
  characterGroups: Array<
    Pick<CharacterGroupData, 'id' | 'name' | 'color1' | 'color2'>
  >
  costumes: Record<string, CardDetailCostumeData>
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
