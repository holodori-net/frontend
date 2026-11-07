import type { CharacterListItemData } from '#shared/game-data/characters'
import { transformCharacters } from './converters/characters.ts'
import { withGameDatabase } from './database.ts'

export function readCharacterList(): CharacterListItemData[] {
  return withGameDatabase((database) => {
    const characters = transformCharacters(database)
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
  })
}
