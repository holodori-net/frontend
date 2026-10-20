import { existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it, vi } from 'vitest'
import { composeCostumeSkillDescription } from '../../shared/game-data/live-skill-description.ts'
import { gameLocales } from '../../shared/language.ts'
import { readCardList } from '../../server/data/card-list.ts'
import { createGameDatabase } from '../../server/data/database.ts'
import { transformLiveSkillData } from '../../server/data/converters/live-skills.ts'

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
          payload.skills.triggers,
        ]) {
          for (const rows of Object.values(groups)) {
            for (const row of rows) {
              expect(Object.keys(row)).toEqual(['description'])
            }
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
  },
)
