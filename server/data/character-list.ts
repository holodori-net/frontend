import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { CharacterListItemData } from '#shared/game-data/characters'
import { transformCharacters } from './converters/characters.ts'
import { createGameDatabase } from './database.ts'

export function readCharacterList(): CharacterListItemData[] {
  const databasePath = resolve(process.cwd(), '.data/master.sqlite')
  console.info(`Loading character list from ${databasePath}`)

  let database: DatabaseSync | undefined
  try {
    database = new DatabaseSync(databasePath, { readOnly: true })
    const characters = transformCharacters(createGameDatabase(database))
    const characterList = characters.map(
      ({ id, name, productionId, assetId, isPlayable, order, color1 }) => ({
        id,
        name,
        productionId,
        assetId,
        isPlayable,
        order,
        color1,
      }),
    )
    console.info(`Loaded ${characterList.length} characters`)
    return characterList
  } catch (cause) {
    const error = new Error(
      `Unable to read character data from ${databasePath}`,
      {
        cause,
      },
    )
    console.error(error)
    throw error
  } finally {
    database?.close()
  }
}
