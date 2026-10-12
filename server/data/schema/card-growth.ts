import { primaryKey, snakeCase, text, integer } from 'drizzle-orm/sqlite-core'

export const cardLevel = snakeCase.table(
  'CardLevel',
  {
    groupId: text().notNull(),
    level: integer().notNull(),
    parameterBaseValue: text().notNull(),
    exp: text(),
    liveDeckPowerPermyriadUp: text(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.level] })],
)

export const cardLevelLimit = snakeCase.table(
  'CardLevelLimit',
  {
    groupId: text().notNull(),
    limitBreakCount: integer().notNull(),
    levelLimit: integer().notNull(),
    consumptions: text(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.limitBreakCount] })],
)

export const cardPotential = snakeCase.table(
  'CardPotential',
  {
    groupId: text().notNull(),
    upgradeCount: integer().notNull(),
    effectType: integer().notNull(),
    value: text().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.groupId, table.upgradeCount, table.effectType],
    }),
  ],
)

export const cardPotentialUpgradeItem = snakeCase.table(
  'CardPotentialUpgradeItem',
  {
    rarity: integer().notNull().primaryKey(),
    itemId: text().notNull(),
  },
)
