import { primaryKey, snakeCase, text, integer } from 'drizzle-orm/sqlite-core'

export const skillTreeConnectEffect = snakeCase.table(
  'SkillTreeConnectEffect',
  {
    id: text().notNull(),
    level: integer().notNull(),
    connectEffectType: integer().notNull(),
    skillTreeConnectEffectExtentGroupId: text().notNull(),
    effectPermilUp: text(),
    additionalSkillTreeEffectId: text(),
    targetSkillTreeEffectId: text(),
    targetNodeType: integer(),
    targetNodeGrade: integer(),
    descriptionLangId: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.id, table.level] })],
)

export const skillTreeConnectEffectExtent = snakeCase.table(
  'SkillTreeConnectEffectExtent',
  {
    groupId: text().notNull(),
    positionX: integer().notNull(),
    positionY: integer().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.groupId, table.positionX, table.positionY],
    }),
  ],
)

export const langGeneratedSkillTreeConnectEffect = snakeCase.table(
  'LangGeneratedSkillTreeConnectEffect',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)
