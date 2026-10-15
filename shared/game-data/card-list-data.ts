import type { LocalizedNames } from './localized-text.ts'

export type CardStatKey = 'performance' | 'technique' | 'sense'

export interface CardListItemData {
  id: string
  characterId: string
  characterOrder: number
  characterAssetId: string | null
  name: LocalizedNames
  characterName: LocalizedNames
  rarity: number
  attributeType: number
  assetId: string | null
  order: number
  stats: Record<CardStatKey, number>
  total: number
  level: number
  specializations: CardStatKey[]
}
