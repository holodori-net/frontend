import type { LocalizedText } from './localized-text.ts'

export interface ConnectPosition {
  x: number
  y: number
}

export interface SkillTreeConnectEffectData {
  id: string
  level: number
  connectEffectType: number
  skillTreeConnectEffectExtentGroupId: string
  effectPermilUp: string | null
  additionalSkillTreeEffectId: string | null
  targetSkillTreeEffectId: string | null
  targetNodeType: number | null
  targetNodeGrade: number | null
  description: LocalizedText
}

export interface SkillTreeConnectData {
  effects: Record<string, SkillTreeConnectEffectData[]>
  extents: Record<string, ConnectPosition[]>
}
