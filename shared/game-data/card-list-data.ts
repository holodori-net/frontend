import type { LocalizedNames, LocalizedText } from './localized-text.ts'
import type { CostumeSkillDescriptionData } from './live-skill-description.ts'
import type { LiveLeaderSkillData } from './live-skills.ts'

export type CardStatKey = 'performance' | 'technique' | 'sense'

export interface CardListItemData {
  id: string
  characterId: string
  costumeId: string | null
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

export interface CardListCostumeData {
  name: LocalizedText
  leaderSkillId: string | null
}

export interface CardListSkillData extends CostumeSkillDescriptionData {
  leaderSkills: Record<string, LiveLeaderSkillData>
}

export interface CardListPayload {
  cards: CardListItemData[]
  costumes: Record<string, CardListCostumeData>
  skills: CardListSkillData
}
