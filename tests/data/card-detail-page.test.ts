import { existsSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { gameLocales, resolveLocalizedName } from '../../shared/language.ts'
import { localizeCardDetailPayload } from '../../shared/game-data/cards/detail-page.ts'
import {
  readCardDetailPayload,
  readCardDetailIndex,
} from '../../server/data/card-detail.ts'
import {
  composeActiveSkillDescription,
  composeCostumeSkillDescription,
  composePassiveSkillDescription,
  composeSpecialSkillDescription,
} from '../../shared/game-data/live-skill-description.ts'

const { iconUrls } = vi.hoisted(() => ({
  iconUrls: {
    stats: {
      performance: 'https://example.test/performance.webp',
      technique: 'https://example.test/technique.webp',
      sense: 'https://example.test/sense.webp',
    },
    attributes: { 1: 'https://example.test/cute.webp' },
  },
}))
vi.mock('../../server/data/card-icons.ts', () => ({
  readCardIconUrls: async () => iconUrls,
}))

const sourcePath = new URL('../../.data/master.sqlite', import.meta.url)

describe.skipIf(!existsSync(sourcePath))(
  'localized card detail page payload',
  () => {
    it('matches every source skill description for every card, locale, and level', async () => {
      for (const id of readCardDetailIndex().cardIds) {
        const source = await readCardDetailPayload(id)
        expect(source, id).not.toBeNull()
        if (!source) continue

        for (const locale of gameLocales) {
          const localized = localizeCardDetailPayload(source, locale)
          const skills = source.skills
          const card = source.card
          const expectedPassive = (
            skills.passiveSkills[card.livePassiveSkillId] ?? []
          )
            .toSorted((left, right) => left.level - right.level)
            .map((row) => ({
              level: row.level,
              effectType:
                skills.effects[row.livePassiveSkillEffectGroupId]?.[0]?.type ??
                null,
              text: composePassiveSkillDescription(
                row,
                skills,
                locale,
                undefined,
                'display',
              ),
            }))
          const expectedActive = (
            skills.activeSkills[card.liveActiveSkillId] ?? []
          )
            .toSorted((left, right) => left.level - right.level)
            .map((row) => ({
              level: row.level,
              effectType:
                skills.activeEffects[row.liveActiveSkillEffectGroupId]?.[0]
                  ?.type ?? null,
              text: composeActiveSkillDescription(
                row,
                skills,
                locale,
                undefined,
                'display',
              ),
            }))
          const expectedSpecial = (
            skills.specialSkills[card.liveSpecialSkillId] ?? []
          )
            .toSorted((left, right) => left.level - right.level)
            .map((row) => ({
              level: row.level,
              effectType:
                skills.activeEffects[row.liveActiveSkillEffectGroupId]?.[0]
                  ?.type ?? null,
              text: composeSpecialSkillDescription(
                row,
                skills,
                locale,
                undefined,
                'display',
              ),
            }))

          expect(
            localized.skills.passiveSkills,
            `${id} ${locale} passive`,
          ).toEqual(expectedPassive)
          expect(
            localized.skills.activeSkills,
            `${id} ${locale} active`,
          ).toEqual(expectedActive)
          expect(
            localized.skills.specialSkills,
            `${id} ${locale} special`,
          ).toEqual(expectedSpecial)

          for (const [costumeId, costume] of Object.entries(source.costumes)) {
            const leader = costume.leaderSkillId
              ? skills.leaderSkills[costume.leaderSkillId]
              : undefined
            expect(localized.costumes[costumeId]?.leaderDescription).toBe(
              leader
                ? composeCostumeSkillDescription(leader, skills, locale)
                : null,
            )
          }

          for (const [effectId, rows] of Object.entries(
            source.connectEffects,
          )) {
            expect(
              localized.connectEffects[effectId]?.map((row) => row.description),
            ).toEqual(
              rows.map((row) => {
                const resolved = resolveLocalizedName(row.description, locale)
                return resolved.text
                  ? {
                      text: resolved.text.replace(/\[\/?highlight\]/g, ''),
                      lang: resolved.lang,
                    }
                  : null
              }),
            )
          }
        }
      }
    }, 30_000)

    it('keeps the Japanese fallback language on resolved names and omits source locale maps', async () => {
      const id = readCardDetailIndex().cardIds[0]
      const source = id ? await readCardDetailPayload(id) : null
      expect(source).not.toBeNull()
      if (!source) return
      source.card.name = {
        jpn: '日本語 fallback',
        eng: '',
        ind: '',
        kor: '',
        cht: '',
        chs: '',
      }

      const localized = localizeCardDetailPayload(source, 'eng')
      expect(localized.iconUrls).toEqual(iconUrls)
      expect(localized.card.name).toEqual({
        text: '日本語 fallback',
        lang: 'ja',
      })
      expect(localized.card.characterName).not.toHaveProperty('jpn')
      expect(localized.skills).not.toHaveProperty('catalog')
      expect(localized).not.toHaveProperty('searchTextByCardId')
    })
  },
)
