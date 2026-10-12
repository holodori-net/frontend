import { primaryKey, snakeCase, text, integer } from 'drizzle-orm/sqlite-core'

export const liveSkillEffectTarget = snakeCase.table('LiveSkillEffectTarget', {
  id: text().notNull().primaryKey(),
  type: integer().notNull(),
  targetCount: integer(),
  characterId: text(),
  characterGroupingId: text(),
  cardAttributeType: integer(),
  descriptionLangId: text().notNull(),
})

export const langGeneratedLiveSkillEffectTarget = snakeCase.table(
  'LangGeneratedLiveSkillEffectTarget',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)
