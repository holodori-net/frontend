import type { GameLocale } from './language'

export type LocalizedNames = Record<GameLocale, string>

export interface CharacterData {
  id: string
  name: LocalizedNames
  assetId: string | null
  isPlayable: boolean
  order: number
}

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

export interface CardGrowthData {
  levels: Record<string, { level: number; parameterBaseValue: number }[]>
  levelLimits: Record<string, { limitBreakCount: number; levelLimit: number }[]>
  potentials: Record<
    string,
    { upgradeCount: number; effectType: number; value: number }[]
  >
}
