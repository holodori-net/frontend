import type { CardListPayload } from './card-list-data.ts'
import { gameLocales } from '../language.ts'
import {
  composeActiveSkillDescription,
  composeCostumeSkillDescription,
  composePassiveSkillDescription,
  composeSpecialSkillDescription,
} from './live-skill-description.ts'
import { tokenizeSkillText } from './skill-text.ts'

function searchableText(value: string) {
  const text = tokenizeSkillText(value)
    .map(({ value: part }) => part)
    .join('')
    .replace(/\[\/?highlight\]/gu, '')
  return text.trim().toLowerCase()
}

/** Build locale-independent search text from every searchable card field. */
export function buildCardSearchTextById(
  payload: Pick<
    CardListPayload,
    'cards' | 'costumes' | 'skills' | 'connectEffects'
  >,
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const card of payload.cards) {
    const values = new Set<string>()
    const add = (value: string | null | undefined) => {
      if (value) {
        const normalized = searchableText(value)
        if (normalized) values.add(normalized)
      }
    }

    for (const locale of gameLocales) {
      add(card.name[locale])
      add(card.characterName[locale])
      const costume = payload.costumes[card.costumeId ?? '']
      add(costume?.name[locale])
      if (costume?.leaderSkillId) {
        const leaderSkill = payload.skills.leaderSkills[costume.leaderSkillId]
        if (leaderSkill) {
          add(
            composeCostumeSkillDescription(leaderSkill, payload.skills, locale),
          )
        }
      }

      for (const skill of payload.skills.passiveSkills[
        card.livePassiveSkillId
      ] ?? []) {
        add(
          composePassiveSkillDescription(
            skill,
            payload.skills,
            locale,
            undefined,
            'display',
          ),
        )
      }
      for (const skill of payload.skills.activeSkills[card.liveActiveSkillId] ??
        []) {
        add(
          composeActiveSkillDescription(
            skill,
            payload.skills,
            locale,
            undefined,
            'display',
          ),
        )
      }
      for (const skill of payload.skills.specialSkills[
        card.liveSpecialSkillId
      ] ?? []) {
        add(
          composeSpecialSkillDescription(
            skill,
            payload.skills,
            locale,
            undefined,
            'display',
          ),
        )
      }
      for (const level of payload.connectEffects[
        card.skillTreeConnectEffectId ?? ''
      ] ?? []) {
        add(level.description[locale])
      }
    }

    result[card.id] = [...values].join('\n')
  }

  return result
}
