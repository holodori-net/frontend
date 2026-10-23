import { existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import {
  calculateCardGrowth,
  getMaxCardGrowth,
} from '../../shared/game-data/card-stats.ts'
import {
  readCardDetail,
  readCardDetailIndex,
} from '../../server/data/card-detail.ts'
import { readCardList } from '../../server/data/card-list.ts'

const sourcePath = new URL('../../.data/master.sqlite', import.meta.url)

describe.skipIf(!existsSync(sourcePath))(
  'local master card detail payloads',
  () => {
    it('matches every card list entry and includes all potential-unlocked skill levels', () => {
      const index = readCardDetailIndex()
      const list = readCardList()
      const database = new DatabaseSync(sourcePath, { readOnly: true })
      const sourceCount = Number(
        database.prepare('SELECT COUNT(*) AS count FROM Card').get()?.count,
      )
      database.close()
      expect(sourceCount).toBeGreaterThan(0)
      expect(index.cardIds).toHaveLength(sourceCount)
      expect(list.cards).toHaveLength(index.cardIds.length)

      for (const id of index.cardIds) {
        const detail = readCardDetail(id)
        const listed = list.cards.find((card) => card.id === id)
        expect(detail, id).not.toBeNull()
        expect(listed, id).toBeDefined()
        const { card, growth, skills, connectEffects } = detail!
        const fullGrowth = calculateCardGrowth(growth, getMaxCardGrowth(growth))
        expect(card).toMatchObject({
          stats: fullGrowth.stats,
          total: fullGrowth.total,
          specializations: fullGrowth.specializations,
        })
        expect(card).toMatchObject({
          stats: listed!.stats,
          total: listed!.total,
          specializations: listed!.specializations,
        })

        expect(
          skills.passiveSkills[card.livePassiveSkillId]?.some(
            (row) => row.level === fullGrowth.skillLevels.passiveSkill,
          ),
          id,
        ).toBe(true)
        expect(
          skills.activeSkills[card.liveActiveSkillId]?.some(
            (row) => row.level === fullGrowth.skillLevels.activeSkill,
          ),
          id,
        ).toBe(true)
        expect(
          skills.specialSkills[card.liveSpecialSkillId]?.some(
            (row) => row.level === fullGrowth.skillLevels.specialSkill,
          ),
          id,
        ).toBe(true)
        if (card.skillTreeConnectEffectId) {
          expect(
            connectEffects[card.skillTreeConnectEffectId]?.some(
              (row) => row.level === fullGrowth.skillLevels.connectEffect,
            ),
            id,
          ).toBe(true)
        } else {
          expect(connectEffects).toEqual({})
        }

        const potentialStages = [
          0,
          ...new Set(growth.potentials.map((row) => row.upgradeCount)),
        ]
        for (const potentialUpgradeCount of potentialStages) {
          const stageGrowth = calculateCardGrowth(growth, {
            ...getMaxCardGrowth(growth),
            potentialUpgradeCount,
          })
          expect(
            skills.passiveSkills[card.livePassiveSkillId]?.some(
              (row) => row.level === stageGrowth.skillLevels.passiveSkill,
            ),
            `${id} passive level ${stageGrowth.skillLevels.passiveSkill} at potential ${potentialUpgradeCount}`,
          ).toBe(true)
          expect(
            skills.activeSkills[card.liveActiveSkillId]?.some(
              (row) => row.level === stageGrowth.skillLevels.activeSkill,
            ),
            `${id} active level ${stageGrowth.skillLevels.activeSkill} at potential ${potentialUpgradeCount}`,
          ).toBe(true)
          expect(
            skills.specialSkills[card.liveSpecialSkillId]?.some(
              (row) => row.level === stageGrowth.skillLevels.specialSkill,
            ),
            `${id} special level ${stageGrowth.skillLevels.specialSkill} at potential ${potentialUpgradeCount}`,
          ).toBe(true)
          if (card.skillTreeConnectEffectId) {
            expect(
              connectEffects[card.skillTreeConnectEffectId]?.some(
                (row) => row.level === stageGrowth.skillLevels.connectEffect,
              ),
              `${id} Connect level ${stageGrowth.skillLevels.connectEffect} at potential ${potentialUpgradeCount}`,
            ).toBe(true)
          }
        }
      }

      expect(readCardDetail('card-that-does-not-exist')).toBeNull()
    }, 30_000)
  },
)
