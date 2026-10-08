import type { LocalizedText } from './localized-text.ts'

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
