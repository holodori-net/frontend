import type { LocalizedText } from './localized-text.ts'
import type { LiveSkillEffectTargetData } from './live-skill-effect-targets.ts'
import type { GameLocale } from '../language.ts'

export type DescriptionDomain = 'effect' | 'trigger' | 'target'
export type DescriptionEntity =
  'target' | 'character' | 'group' | 'attribute' | 'judgement'
export type DescriptionParam =
  number | string | { kind: DescriptionEntity; id: string }
export interface SkillDescription {
  templateId: string
  params: Record<string, DescriptionParam>
}
export interface DescriptionTemplate {
  domain: DescriptionDomain
  type: number
  parameters: string[]
  text: LocalizedText
}
export type ConfirmedDescriptionTemplates = Partial<
  Record<
    DescriptionDomain,
    Record<number, Pick<DescriptionTemplate, 'parameters' | 'text'>[]>
  >
>
export interface DescriptionCatalog {
  templates: Record<string, DescriptionTemplate>
  labels: Record<
    Exclude<DescriptionEntity, 'target'>,
    Record<string, LocalizedText>
  >
}
export interface PendingDescription {
  table: string
  key: string
  type: number | null
  language: GameLocale | null
  reason: string
}
export interface CostumeData {
  id: string
  characterId: string
  name: LocalizedText
  liveLeaderSkillId: string | null
}
export interface LiveLeaderSkillData {
  id: string
  liveSkillTriggerGroupId: string | null
  livePassiveSkillEffectGroupId: string
  additionalLiveSkillTriggerGroupId: string | null
  additionalLivePassiveSkillEffectGroupId: string | null
}
export interface LivePassiveSkillEffectData {
  groupId: string
  number: number
  type: number
  value: string | null
  liveSkillEffectTargetId: string | null
  resourceType: number | null
  resourceIds: string[] | null
  description: SkillDescription | null
}
export interface LiveSkillTriggerData {
  groupId: string
  number: number
  type: number
  threshold: string | null
  characterIds: string[] | null
  characterGroupingId: string | null
  musicId: string | null
  cardAttributeType: number | null
  liveNoteJudgementType: number | null
  description: SkillDescription | null
}
export interface LiveSkillTargetData extends Omit<
  LiveSkillEffectTargetData,
  'description'
> {
  description: SkillDescription | null
}
export interface LiveSkillData {
  costumes: CostumeData[]
  leaderSkills: LiveLeaderSkillData[]
  effects: Record<string, LivePassiveSkillEffectData[]>
  triggers: Record<string, LiveSkillTriggerData[]>
  targets: LiveSkillTargetData[]
  catalog: DescriptionCatalog
  pendingDescriptions: PendingDescription[]
}
