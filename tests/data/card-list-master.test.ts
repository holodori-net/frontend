import { existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it, vi } from 'vitest'
import {
  composeActiveSkillDescription,
  composeCostumeSkillDescription,
  composePassiveSkillDescription,
  composeSpecialSkillDescription,
} from '../../shared/game-data/live-skill-description.ts'
import { gameLocales } from '../../shared/language.ts'
import type { GameLocale } from '../../shared/language.ts'
import type { CardSkillDescriptionData } from '../../shared/game-data/live-skill-description.ts'
import { readCardList } from '../../server/data/card-list.ts'
import { createGameDatabase } from '../../server/data/database.ts'
import { transformLiveSkillData } from '../../server/data/converters/live-skills.ts'
import { transformCardSkillData } from '../../server/data/converters/card-skills.ts'

const sourcePath = new URL('../../.data/master.sqlite', import.meta.url)

describe.skipIf(!existsSync(sourcePath))(
  'local master card list payload',
  () => {
    it('keeps reachable costume skill descriptions equivalent to full data', () => {
      const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const payload = readCardList()
      const database = new DatabaseSync(sourcePath, { readOnly: true })
      try {
        const fullSkills = transformLiveSkillData(createGameDatabase(database))
        const fullCardSkills = transformCardSkillData(
          createGameDatabase(database),
        )
        const cardCount = Number(
          database.prepare('SELECT COUNT(*) AS count FROM Card').get()?.count,
        )
        expect(payload.cards).toHaveLength(cardCount)

        const selectedCostumeIds = new Set(
          payload.cards.map(({ costumeId }) => costumeId).filter(Boolean),
        )
        expect(Object.keys(payload.costumes).sort()).toEqual(
          [...selectedCostumeIds].sort(),
        )
        const sourceCostumes = new Map(
          fullSkills.costumes.map((costume) => [costume.id, costume]),
        )
        for (const card of payload.cards) {
          const costume = payload.costumes[card.costumeId!]
          expect(costume).toBeDefined()
          expect(sourceCostumes.get(card.costumeId!)?.characterId).toBe(
            card.characterId,
          )
        }

        const verifyCardSkills = <T extends { level: number }>(
          ids: Set<string>,
          projected: Record<string, T[]>,
          full: Record<string, T[]>,
          compose: (
            skill: T,
            data: CardSkillDescriptionData,
            locale: GameLocale,
          ) => string | null,
        ) => {
          expect(Object.keys(projected).sort()).toEqual([...ids].sort())
          for (const id of ids) {
            expect(projected[id]).toEqual(full[id])
            for (const level of projected[id]!) {
              for (const locale of gameLocales) {
                expect(
                  compose(level, payload.skills, locale),
                  `${id} level ${level.level} (${locale})`,
                ).toEqual(compose(level, fullCardSkills, locale))
              }
            }
          }
        }
        verifyCardSkills(
          new Set(
            payload.cards.map(({ livePassiveSkillId }) => livePassiveSkillId),
          ),
          payload.skills.passiveSkills,
          fullCardSkills.passiveSkills,
          composePassiveSkillDescription,
        )
        verifyCardSkills(
          new Set(
            payload.cards.map(({ liveActiveSkillId }) => liveActiveSkillId),
          ),
          payload.skills.activeSkills,
          fullCardSkills.activeSkills,
          composeActiveSkillDescription,
        )
        verifyCardSkills(
          new Set(
            payload.cards.map(({ liveSpecialSkillId }) => liveSpecialSkillId),
          ),
          payload.skills.specialSkills,
          fullCardSkills.specialSkills,
          composeSpecialSkillDescription,
        )

        const referencedSkillIds = new Set(
          Object.values(payload.costumes)
            .map(({ leaderSkillId }) => leaderSkillId)
            .filter((id): id is string => id !== null),
        )
        for (const id of referencedSkillIds) {
          const projected = payload.skills.leaderSkills[id]
          const full = fullSkills.leaderSkills.find((skill) => skill.id === id)
          expect(projected).toBeDefined()
          expect(full).toBeDefined()
          for (const locale of gameLocales) {
            const projectedText = composeCostumeSkillDescription(
              projected!,
              payload.skills,
              locale,
            )
            const fullText = composeCostumeSkillDescription(
              full!,
              fullSkills,
              locale,
            )
            expect(projectedText, `${id} (${locale})`).toEqual(
              expect.any(String),
            )
            expect(
              projectedText,
              `${id} (${locale}) projected/confirmed composition`,
            ).toBe(fullText)
          }
        }

        expect(payload.skills).not.toHaveProperty('pendingDescriptions')
        expect(payload.skills).not.toHaveProperty('costumes')
        for (const skill of Object.values(payload.skills.leaderSkills)) {
          expect(Object.keys(skill).sort()).toEqual([
            'additionalLivePassiveSkillEffectGroupId',
            'additionalLiveSkillTriggerGroupId',
            'id',
            'livePassiveSkillEffectGroupId',
            'liveSkillTriggerGroupId',
          ])
        }
        for (const template of Object.values(
          payload.skills.catalog.templates,
        )) {
          expect(Object.keys(template).sort()).toEqual(['parameters', 'text'])
        }
        for (const groups of [
          payload.skills.effects,
          payload.skills.activeEffects,
        ]) {
          for (const rows of Object.values(groups)) {
            for (const row of rows) {
              expect(Object.keys(row).sort()).toEqual(['description', 'type'])
              expect(typeof row.type).toBe('number')
            }
          }
        }
        for (const rows of Object.values(payload.skills.triggers)) {
          for (const row of rows) {
            expect(Object.keys(row)).toEqual(['description'])
          }
        }
        for (const target of payload.skills.targets) {
          expect(Object.keys(target).sort()).toEqual(['description', 'id'])
        }
        console.info(
          `[card-list master] cards=${payload.cards.length}, costumes=${Object.keys(payload.costumes).length}, skills=${Object.keys(payload.skills.leaderSkills).length}, payload=${Buffer.byteLength(JSON.stringify(payload))} bytes`,
        )
      } finally {
        warnings.mockRestore()
        database.close()
      }
    })

    it('projects reachable connect effects, ranges, and localized descriptions from SQLite', () => {
      const payload = readCardList()
      const database = new DatabaseSync(sourcePath, { readOnly: true })
      try {
        interface ConnectSourceRow {
          effectId: string
          level: number
          extentGroupId: string
          language: string
          text: string
          x: number
          y: number
        }
        const referencedEffectIds = new Set(
          (
            database
              .prepare(
                'SELECT DISTINCT skill_tree_connect_effect_id AS id FROM Card WHERE skill_tree_connect_effect_id IS NOT NULL',
              )
              .all() as unknown as { id: string }[]
          ).map(({ id }) => id),
        )
        const sourceRows = database
          .prepare(
            `
            SELECT
              effect.id AS effectId,
              effect.level AS level,
              effect.skill_tree_connect_effect_extent_group_id AS extentGroupId,
              language.language AS language,
              language.text AS text,
              extent.position_x AS x,
              extent.position_y AS y
            FROM Card AS card
            JOIN SkillTreeConnectEffect AS effect
              ON effect.id = card.skill_tree_connect_effect_id
            JOIN SkillTreeConnectEffectExtent AS extent
              ON extent.group_id = effect.skill_tree_connect_effect_extent_group_id
            JOIN LangGeneratedSkillTreeConnectEffect AS language
              ON language.id = effect.description_lang_id
            WHERE card.skill_tree_connect_effect_id IS NOT NULL
            ORDER BY effect.id, effect.level, language.language, extent.position_y, extent.position_x
          `,
          )
          .all() as unknown as ConnectSourceRow[]

        const sourceLevels = new Map<
          string,
          Map<
            number,
            {
              extentGroupId: string
              description: Record<string, string>
              coordinates: Map<string, { x: number; y: number }>
            }
          >
        >()
        for (const row of sourceRows) {
          const levels = sourceLevels.get(row.effectId) ?? new Map()
          sourceLevels.set(row.effectId, levels)
          const level = levels.get(row.level) ?? {
            extentGroupId: row.extentGroupId,
            description: {},
            coordinates: new Map(),
          }
          levels.set(row.level, level)
          level.description[row.language] = row.text
          level.coordinates.set(`${row.x},${row.y}`, { x: row.x, y: row.y })
        }

        expect(Object.keys(payload.connectEffects).sort()).toEqual(
          [...referencedEffectIds].sort(),
        )
        const expectedExtents = new Map<
          string,
          Map<string, { x: number; y: number }>
        >()
        for (const [effectId, levels] of sourceLevels) {
          const projectedLevels = payload.connectEffects[effectId]
          expect(projectedLevels?.map(({ level }) => level)).toEqual(
            [...levels.keys()].sort((left, right) => left - right),
          )
          for (const [levelNumber, source] of levels) {
            expect(
              gameLocales.every((locale) => locale in source.description),
            ).toBe(true)
            const projected = projectedLevels?.find(
              ({ level }) => level === levelNumber,
            )
            expect(projected).toEqual({
              level: levelNumber,
              extentGroupId: source.extentGroupId,
              description: source.description,
            })
            const extent =
              expectedExtents.get(source.extentGroupId) ?? new Map()
            expectedExtents.set(source.extentGroupId, extent)
            for (const [key, coordinate] of source.coordinates)
              extent.set(key, coordinate)
            expect(source.coordinates.size).toBeGreaterThan(0)
          }
        }
        expect(Object.keys(payload.connectExtents).sort()).toEqual(
          [...expectedExtents.keys()].sort(),
        )
        for (const [groupId, coordinates] of expectedExtents) {
          const expected = [...coordinates.values()].sort(
            (left, right) => left.y - right.y || left.x - right.x,
          )
          expect(payload.connectExtents[groupId]).toEqual(expected)
        }

        const sourceCards = database
          .prepare(
            'SELECT id, skill_tree_connect_effect_id AS effectId FROM Card',
          )
          .all() as unknown as { id: string; effectId: string | null }[]
        expect(payload.cards).toHaveLength(sourceCards.length)
        for (const card of sourceCards)
          expect(
            payload.cards.find(({ id }) => id === card.id)
              ?.skillTreeConnectEffectId,
          ).toBe(card.effectId)
        expect(sourceCards.some(({ effectId }) => effectId === null)).toBe(true)

        const ayameEffectId =
          'skill_tree_connect_effect-skill_tree_effect_up-skill_tree_connect_effect_extent-card_area-001-rare_5'
        const ayameCard = payload.cards.find(
          ({ id }) => id === 'card-00010-5-uniq-0069-00',
        )
        expect(ayameCard?.skillTreeConnectEffectId).toBe(ayameEffectId)
        const ayameLevels = payload.connectEffects[ayameEffectId]
        expect(ayameLevels?.map(({ level }) => level)).toEqual([1, 2])
        const ayameSourceValues = database
          .prepare(
            'SELECT level, effect_permil_up AS value FROM SkillTreeConnectEffect WHERE id = ? ORDER BY level',
          )
          .all(ayameEffectId) as unknown as { level: number; value: string }[]
        expect(ayameSourceValues).toEqual([
          { level: 1, value: '1100' },
          { level: 2, value: '1600' },
        ])
        expect(ayameLevels?.[0]?.description.eng).toContain('110%')
        expect(ayameLevels?.[1]?.description.eng).toContain(
          '[highlight]160[/highlight]%',
        )
        expect(
          payload.connectExtents[ayameLevels![0]!.extentGroupId],
        ).toHaveLength(6)
      } finally {
        database.close()
      }
    })
  },
)
