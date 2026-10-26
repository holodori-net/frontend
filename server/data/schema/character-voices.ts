import { snakeCase, text } from 'drizzle-orm/sqlite-core'

export const characterVoice = snakeCase.table('CharacterVoice', {
  id: text().notNull().primaryKey(),
  voiceAssetId: text(),
})
