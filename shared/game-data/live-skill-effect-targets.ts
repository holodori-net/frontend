import type { LocalizedText } from './localized-text.ts'

export interface LiveSkillEffectTargetData {
  id: string
  type: number
  targetCount: number | null
  characterId: string | null
  characterGroupingId: string | null
  cardAttributeType: number | null
  description: LocalizedText
}
