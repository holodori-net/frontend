import { primaryKey, snakeCase, text, integer } from 'drizzle-orm/sqlite-core'

export const card = snakeCase.table('Card', {
  id: text().notNull().primaryKey(),
  characterId: text().notNull(),
  nameLangId: text().notNull(),
  rarity: integer().notNull(),
  attributeType: integer().notNull(),
  assetId: text(),
  assetType: integer().notNull(),
  verticalAnchorType: integer().notNull(),
  horizontalAnchorType: integer().notNull(),
  order: integer().notNull(),
  cardLevelGroupId: text().notNull(),
  cardLevelLimitGroupId: text().notNull(),
  cardPotentialGroupId: text().notNull(),
  performancePermilMultiply: integer().notNull(),
  techniquePermilMultiply: integer().notNull(),
  sensePermilMultiply: integer().notNull(),
})

export const langCard = snakeCase.table(
  'LangCard',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)
