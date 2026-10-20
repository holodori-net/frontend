import type {
  DescriptionCatalog,
  LivePassiveSkillEffectData,
  LiveSkillTargetData,
  LiveSkillTriggerData,
  PendingDescription,
  SkillDescription,
} from './live-skills.ts'

export interface LivePassiveSkillLevelData {
  livePassiveSkillId: string
  level: number
  liveSkillTriggerGroupId: string | null
  livePassiveSkillEffectGroupId: string
  additionalLiveSkillTriggerGroupId: string | null
  additionalLivePassiveSkillEffectGroupId: string | null
}

export interface LiveActiveSkillLevelData {
  liveActiveSkillId: string
  level: number
  liveSkillTriggerGroupId: string | null
  liveActiveSkillEffectGroupId: string
  additionalLiveSkillTriggerGroupId: string | null
  additionalLiveActiveSkillEffectGroupId: string | null
  coolTimeMillisecond: number | null
  activationProbabilityPermilMultiply: number | null
  limitCount: number | null
  effectDurationMillisecond: number | null
}

export interface LiveSpecialSkillLevelData {
  liveSpecialSkillId: string
  level: number
  liveActiveSkillEffectGroupId: string
  additionalLiveSkillTriggerGroupId: string | null
  additionalLiveActiveSkillEffectGroupId: string | null
  effectDurationMillisecond: number | null
}

export interface LiveActiveSkillEffectData {
  groupId: string
  number: number
  type: number
  value: string | null
  scoreUpBasedOnParameterPermilMultiply: number | null
  description: SkillDescription | null
}

export interface CardSkillData {
  passiveSkills: Record<string, LivePassiveSkillLevelData[]>
  activeSkills: Record<string, LiveActiveSkillLevelData[]>
  specialSkills: Record<string, LiveSpecialSkillLevelData[]>
  effects: Record<string, LivePassiveSkillEffectData[]>
  activeEffects: Record<string, LiveActiveSkillEffectData[]>
  triggers: Record<string, LiveSkillTriggerData[]>
  targets: LiveSkillTargetData[]
  catalog: DescriptionCatalog
  pendingDescriptions: PendingDescription[]
}
