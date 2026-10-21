import type { LocalizedNames, LocalizedText } from './localized-text.ts'
import type { CardSkillDescriptionData } from './live-skill-description.ts'
import type { LiveLeaderSkillData, SkillDescription } from './live-skills.ts'
import type {
  LiveActiveSkillLevelData,
  LivePassiveSkillLevelData,
  LiveSpecialSkillLevelData,
} from './card-skills.ts'

export type CardStatKey = 'performance' | 'technique' | 'sense'

export interface CardListItemData {
  id: string
  characterId: string
  costumeId: string | null
  livePassiveSkillId: string
  liveActiveSkillId: string
  liveSpecialSkillId: string
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

export interface CardListSkillData extends Omit<
  CardSkillDescriptionData,
  'effects' | 'activeEffects'
> {
  leaderSkills: Record<string, LiveLeaderSkillData>
  passiveSkills: Record<string, LivePassiveSkillLevelData[]>
  activeSkills: Record<string, LiveActiveSkillLevelData[]>
  specialSkills: Record<string, LiveSpecialSkillLevelData[]>
  effects: Readonly<
    Record<
      string,
      readonly {
        type: number
        description: SkillDescription | null
      }[]
    >
  >
  activeEffects: Readonly<
    Record<
      string,
      readonly {
        type: number
        description: SkillDescription | null
      }[]
    >
  >
}

export interface CardListPayload {
  cards: CardListItemData[]
  costumes: Record<string, CardListCostumeData>
  skills: CardListSkillData
}
