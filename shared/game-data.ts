import type { GameLocale } from './language'

export type LocalizedText = Record<GameLocale, string>
export type LocalizedNames = LocalizedText

export interface CharacterData {
  id: string
  name: LocalizedNames
  assetId: string | null
  isPlayable: boolean
  regularGroupIds: string[]
  order: number
}

export interface CharacterGroupData {
  id: string
  name: LocalizedText
  description: LocalizedText
  isRegular: boolean
  characterIds: string[]
  assetId: string
  color1: string
  color2: string
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
