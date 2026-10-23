import { existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import {
  buildCardConnectFilterCatalog,
  countCardConnectOptions,
} from '../../shared/game-data/card-connect-filter.ts'
import { readCardList } from '../../server/data/card-list.ts'

const sourcePath = new URL('../../.data/master.sqlite', import.meta.url)

describe.skipIf(!existsSync(sourcePath))(
  'master card connect filter catalog',
  () => {
    it('matches card extent references from every source effect level', () => {
      const payload = readCardList()
      const catalog = buildCardConnectFilterCatalog(payload)
      const database = new DatabaseSync(sourcePath, { readOnly: true })

      try {
        const sourceReferences = database
          .prepare(
            `SELECT card.id AS cardId,
                  extent.group_id AS extentGroupId,
                  extent.position_x AS x,
                  extent.position_y AS y
           FROM Card AS card
           JOIN SkillTreeConnectEffect AS effect
             ON effect.id = card.skill_tree_connect_effect_id
           JOIN SkillTreeConnectEffectExtent AS extent
             ON extent.group_id = effect.skill_tree_connect_effect_extent_group_id
           ORDER BY card.id, extent.group_id`,
          )
          .all() as unknown as {
          cardId: string
          extentGroupId: string
          x: number
          y: number
        }[]
        const sourceCardCounts = database
          .prepare(
            `SELECT COUNT(DISTINCT card.id) AS connectedCards
           FROM Card AS card
           JOIN SkillTreeConnectEffect AS effect
             ON effect.id = card.skill_tree_connect_effect_id
           JOIN SkillTreeConnectEffectExtent AS extent
             ON extent.group_id = effect.skill_tree_connect_effect_extent_group_id`,
          )
          .get() as { connectedCards: number }
        const sourceExtentCount = database
          .prepare(
            `SELECT COUNT(DISTINCT extent.group_id) AS count
           FROM Card AS card
           JOIN SkillTreeConnectEffect AS effect
             ON effect.id = card.skill_tree_connect_effect_id
           JOIN SkillTreeConnectEffectExtent AS extent
             ON extent.group_id = effect.skill_tree_connect_effect_extent_group_id`,
          )
          .get() as { count: number }
        const sourceNullCards = database
          .prepare(
            'SELECT id FROM Card WHERE skill_tree_connect_effect_id IS NULL ORDER BY id',
          )
          .all() as unknown as { id: string }[]

        const expectedByCard = new Map<string, Set<string>>()
        const expectedPositions = new Map<string, Set<string>>()
        const expectedCards = new Map<string, Set<string>>()
        for (const { cardId, extentGroupId, x, y } of sourceReferences) {
          const extents = expectedByCard.get(cardId) ?? new Set<string>()
          expectedByCard.set(cardId, extents)
          extents.add(extentGroupId)
          const positions =
            expectedPositions.get(extentGroupId) ?? new Set<string>()
          expectedPositions.set(extentGroupId, positions)
          positions.add(`${x},${y}`)
          const cards = expectedCards.get(extentGroupId) ?? new Set<string>()
          expectedCards.set(extentGroupId, cards)
          cards.add(cardId)
        }

        expect(catalog.options).toHaveLength(sourceExtentCount.count)
        const counts = countCardConnectOptions(
          catalog.options,
          payload.cards.map(({ id }) => id),
          catalog.cardExtents,
        )
        for (const option of catalog.options) {
          expect(
            option.positions.map(({ x, y }) => `${x},${y}`).sort(),
          ).toEqual([...expectedPositions.get(option.key)!].sort())
          expect(counts[option.key]).toBe(expectedCards.get(option.key)!.size)
        }
        expect(
          Object.values(catalog.cardExtents).filter(
            (extents) => extents.length > 0,
          ),
        ).toHaveLength(sourceCardCounts.connectedCards)

        for (const { id } of sourceNullCards)
          expect(catalog.cardExtents[id]).toEqual([])

        expect(Object.keys(catalog.cardExtents).sort()).toEqual(
          payload.cards.map(({ id }) => id).sort(),
        )
        for (const card of payload.cards) {
          expect([...new Set(catalog.cardExtents[card.id])].sort()).toEqual(
            [...(expectedByCard.get(card.id) ?? [])].sort(),
          )
        }
      } finally {
        database.close()
      }
    })
  },
)
