import type { LocalizedNames } from './localized-text.ts'

export interface CardGrowth {
  levelGroupId: string
  levelLimitGroupId: string
  potentialGroupId: string
  weightsPermil: {
    performance: number
    technique: number
    sense: number
  }
}

export interface CardData {
  id: string
  characterId: string
  rewardCostumeId: string | null
  name: LocalizedNames
  rarity: number
  attributeType: number
  assetId: string | null
  assetType: number
  verticalAnchorType: number
  horizontalAnchorType: number
  order: number
  growth: CardGrowth
}
