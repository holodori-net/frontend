import type { CharacterData } from '../../shared/game-data/characters'

export default defineEventHandler(async () => {
  const characters =
    await useStorage('assets:game-data').getItem<CharacterData[]>(
      'characters.json',
    )
  if (!characters) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Character data is unavailable',
    })
  }
  return characters
})
