import type { LocalizedNames, LocalizedText } from './localized-text.ts'

export interface CharacterData {
  id: string
  name: LocalizedNames
  shortName: LocalizedText
  productionId: string | null
  birthday: { month: number; day: number }
  debutDate: { year: number; month: number; day: number }
  fanName: LocalizedText | null
  description: LocalizedText | null
  comment: LocalizedText | null
  youtubeUrl: string | null
  xUrl: string | null
  personalityType: number | null
  sdPersonalityType: number | null
  assetId: string | null
  isPlayable: boolean
  regularGroupIds: string[]
  regularGroupName: LocalizedText | null
  order: number
  dominantHandType: number
  isTutorial: boolean | null
  defaultCostumeId: string
  defaultSdCostumeId: string
  bgmAssetId: string | null
  color1: string | null
  color2: string | null
  color3: string | null
  color4: string | null
  color5: string | null
  growth: {
    levelGroupId: string | null
    skillTreeNodePositionGroupId: string | null
    skillTreePointId: string | null
  }
}

export type CharacterListItemData = Pick<
  CharacterData,
  'id' | 'name' | 'productionId' | 'assetId' | 'isPlayable' | 'order' | 'color1'
>
