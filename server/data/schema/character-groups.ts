import { primaryKey, snakeCase, text, integer } from 'drizzle-orm/sqlite-core'

export const characterGrouping = snakeCase.table('CharacterGrouping', {
  id: text().notNull().primaryKey(),
  nameLangId: text().notNull(),
  descriptionLangId: text().notNull(),
  isRegular: integer(),
  characterIds: text(),
  assetId: text().notNull(),
  color1: text().notNull(),
  color2: text().notNull(),
  order: integer().notNull(),
})

export const langCharacterGrouping = snakeCase.table(
  'LangCharacterGrouping',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)
