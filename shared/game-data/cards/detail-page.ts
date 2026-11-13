import { resolveLocalizedName, type GameLocale } from '../../language.ts'
import type { CardDetailPayload } from './detail.ts'
import type { CardListSkillData } from './list-data.ts'
import {
  composeActiveSkillDescription,
  composeCostumeSkillDescription,
  composePassiveSkillDescription,
  composeSpecialSkillDescription,
} from '../live-skill-description.ts'

export interface CardDetailLocalizedText {
  text: string
  lang: string
}

export interface CardDetailPageSkillLevel {
  level: number
  effectType: number | null
  text: string | null
}

export interface CardDetailPagePayload {
  voiceAssetId: CardDetailPayload['voiceAssetId']
  card: Omit<CardDetailPayload['card'], 'name' | 'characterName'> & {
    name: CardDetailLocalizedText
    characterName: CardDetailLocalizedText
  }
  characterGroups: Array<
    Omit<CardDetailPayload['characterGroups'][number], 'name'> & {
      name: CardDetailLocalizedText
    }
  >
  costumes: Record<
    string,
    Omit<CardDetailPayload['costumes'][string], 'name'> & {
      name: CardDetailLocalizedText
      leaderDescription: string | null
    }
  >
  skills: {
    passiveSkills: CardDetailPageSkillLevel[]
    activeSkills: CardDetailPageSkillLevel[]
    specialSkills: CardDetailPageSkillLevel[]
  }
  connectEffects: Record<
    string,
    Array<{
      level: number
      extentGroupId: string
      description: CardDetailLocalizedText | null
    }>
  >
  connectExtents: CardDetailPayload['connectExtents']
  growth: CardDetailPayload['growth']
}

function resolveText(
  value: Readonly<Record<GameLocale, string>>,
  locale: GameLocale,
): CardDetailLocalizedText {
  const resolved = resolveLocalizedName(value, locale)
  return { text: resolved.text, lang: resolved.lang }
}

function resolveConnectText(
  value: Readonly<Record<GameLocale, string>>,
  locale: GameLocale,
): CardDetailLocalizedText | null {
  const resolved = resolveText(value, locale)
  return resolved.text
    ? { ...resolved, text: resolved.text.replace(/\[\/?highlight\]/g, '') }
    : null
}

export function localizeCardDetailPayload(
  payload: CardDetailPayload,
  locale: GameLocale,
): CardDetailPagePayload {
  const skills: CardListSkillData = payload.skills
  const card = payload.card
  const byLevels = <T extends { level: number }>(
    rows: readonly T[] | undefined,
    describe: (row: T) => string | null,
    effectType: (row: T) => number | undefined,
  ): CardDetailPageSkillLevel[] =>
    [...(rows ?? [])]
      .sort((left, right) => left.level - right.level)
      .map((row) => ({
        level: row.level,
        effectType: effectType(row) ?? null,
        text: describe(row),
      }))

  const passiveSkills = byLevels(
    skills.passiveSkills[card.livePassiveSkillId],
    (row) =>
      composePassiveSkillDescription(row, skills, locale, undefined, 'display'),
    (row) => skills.effects[row.livePassiveSkillEffectGroupId]?.[0]?.type,
  )
  const activeSkills = byLevels(
    skills.activeSkills[card.liveActiveSkillId],
    (row) =>
      composeActiveSkillDescription(row, skills, locale, undefined, 'display'),
    (row) => skills.activeEffects[row.liveActiveSkillEffectGroupId]?.[0]?.type,
  )
  const specialSkills = byLevels(
    skills.specialSkills[card.liveSpecialSkillId],
    (row) =>
      composeSpecialSkillDescription(row, skills, locale, undefined, 'display'),
    (row) => skills.activeEffects[row.liveActiveSkillEffectGroupId]?.[0]?.type,
  )

  const costumes: CardDetailPagePayload['costumes'] = {}
  for (const [id, costume] of Object.entries(payload.costumes)) {
    const leaderSkill = costume.leaderSkillId
      ? skills.leaderSkills[costume.leaderSkillId]
      : undefined
    costumes[id] = {
      ...costume,
      name: resolveText(costume.name, locale),
      leaderDescription: leaderSkill
        ? composeCostumeSkillDescription(leaderSkill, skills, locale)
        : null,
    }
  }

  const connectEffects: CardDetailPagePayload['connectEffects'] = {}
  for (const [id, rows] of Object.entries(payload.connectEffects)) {
    connectEffects[id] = rows.map((row) => ({
      level: row.level,
      extentGroupId: row.extentGroupId,
      description: resolveConnectText(row.description, locale),
    }))
  }

  return {
    voiceAssetId: payload.voiceAssetId,
    card: {
      ...card,
      name: resolveText(card.name, locale),
      characterName: resolveText(card.characterName, locale),
    },
    characterGroups: payload.characterGroups.map((group) => ({
      ...group,
      name: resolveText(group.name, locale),
    })),
    costumes,
    skills: { passiveSkills, activeSkills, specialSkills },
    connectEffects,
    connectExtents: payload.connectExtents,
    growth: payload.growth,
  }
}
