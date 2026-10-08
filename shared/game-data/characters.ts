import type { LocalizedNames } from './localized-text.ts'

export interface CharacterData {
  id: string
  name: LocalizedNames
  assetId: string | null
  isPlayable: boolean
  regularGroupIds: string[]
  order: number
}
