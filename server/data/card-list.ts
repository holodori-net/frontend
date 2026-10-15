import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { CardListItemData } from '#shared/game-data/card-list-data'
import { transformCardGrowth } from './converters/card-growth.ts'
import { transformCards } from './converters/cards.ts'
import { transformCharacters } from './converters/characters.ts'
import { createGameDatabase } from './database.ts'
import { calculateCardListStats } from './card-list-stats.ts'

export function readCardList(): CardListItemData[] {
  const databasePath = resolve(process.cwd(), '.data/master.sqlite')
  console.info(`Loading card list from ${databasePath}`)

  let database: DatabaseSync | undefined
  try {
    database = new DatabaseSync(databasePath, { readOnly: true })
    const gameDatabase = createGameDatabase(database)
    const cards = transformCards(gameDatabase)
    if (cards.length === 0) {
      console.info('Loaded 0 cards')
      return []
    }

    const characters = transformCharacters(gameDatabase)
    const growth = transformCardGrowth(gameDatabase)
    const charactersById = new Map(
      characters.map((character) => [character.id, character]),
    )

    const cardList = cards.map((card): CardListItemData => {
      const character = charactersById.get(card.characterId)
      if (!character) {
        throw new Error(
          `Card ${card.id} references missing Character ${card.characterId}`,
        )
      }

      const levelLimitRows = growth.levelLimits[card.growth.levelLimitGroupId]
      if (!levelLimitRows?.length) {
        throw new Error(
          `Card ${card.id} references missing CardLevelLimit group ${card.growth.levelLimitGroupId}`,
        )
      }
      const level = Math.max(...levelLimitRows.map((row) => row.levelLimit))
      const levelRow = growth.levels[card.growth.levelGroupId]?.find(
        (row) => row.level === level,
      )
      if (!levelRow) {
        throw new Error(
          `Card ${card.id} has no CardLevel row for group ${card.growth.levelGroupId} at level ${level}`,
        )
      }
      if (!growth.potentials[card.growth.potentialGroupId]?.length) {
        throw new Error(
          `Card ${card.id} references missing CardPotential group ${card.growth.potentialGroupId}`,
        )
      }

      return {
        id: card.id,
        characterId: card.characterId,
        characterOrder: character.order,
        characterAssetId: character.assetId,
        name: card.name,
        characterName: character.name,
        rarity: card.rarity,
        attributeType: card.attributeType,
        assetId: card.assetId,
        order: card.order,
        level,
        ...calculateCardListStats(card, levelRow.parameterBaseValue, growth),
      }
    })
    console.info(`Loaded ${cardList.length} cards`)
    return cardList
  } catch (cause) {
    const error = new Error(`Unable to read card data from ${databasePath}`, {
      cause,
    })
    console.error(error)
    throw error
  } finally {
    database?.close()
  }
}
