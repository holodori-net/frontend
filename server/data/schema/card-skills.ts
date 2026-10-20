import { primaryKey, snakeCase, text, integer } from 'drizzle-orm/sqlite-core'

export const livePassiveSkill = snakeCase.table('LivePassiveSkill', {
  id: text().notNull().primaryKey(),
})

export const livePassiveSkillLevel = snakeCase.table(
  'LivePassiveSkillLevel',
  {
    livePassiveSkillId: text().notNull(),
    level: integer().notNull(),
    liveSkillTriggerGroupId: text(),
    livePassiveSkillEffectGroupId: text().notNull(),
    additionalLiveSkillTriggerGroupId: text(),
    additionalLivePassiveSkillEffectGroupId: text(),
    descriptionLangId: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.livePassiveSkillId, table.level] })],
)

export const liveActiveSkill = snakeCase.table('LiveActiveSkill', {
  id: text().notNull().primaryKey(),
})

export const liveActiveSkillLevel = snakeCase.table(
  'LiveActiveSkillLevel',
  {
    liveActiveSkillId: text().notNull(),
    level: integer().notNull(),
    liveSkillTriggerGroupId: text(),
    liveActiveSkillEffectGroupId: text().notNull(),
    additionalLiveSkillTriggerGroupId: text(),
    additionalLiveActiveSkillEffectGroupId: text(),
    coolTimeMillisecond: integer(),
    activationProbabilityPermilMultiply: integer(),
    limitCount: integer(),
    effectDurationMillisecond: integer(),
    descriptionLangId: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.liveActiveSkillId, table.level] })],
)

export const liveSpecialSkill = snakeCase.table('LiveSpecialSkill', {
  id: text().notNull().primaryKey(),
})

export const liveSpecialSkillLevel = snakeCase.table(
  'LiveSpecialSkillLevel',
  {
    liveSpecialSkillId: text().notNull(),
    level: integer().notNull(),
    liveActiveSkillEffectGroupId: text().notNull(),
    additionalLiveSkillTriggerGroupId: text(),
    additionalLiveActiveSkillEffectGroupId: text(),
    effectDurationMillisecond: integer(),
    descriptionLangId: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.liveSpecialSkillId, table.level] })],
)

export const liveActiveSkillEffect = snakeCase.table(
  'LiveActiveSkillEffect',
  {
    groupId: text().notNull(),
    number: integer().notNull(),
    type: integer().notNull(),
    value: text(),
    scoreUpBasedOnParameterPermilMultiply: integer(),
    descriptionLangId: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.number] })],
)

export const langGeneratedLivePassiveSkillLevel = snakeCase.table(
  'LangGeneratedLivePassiveSkillLevel',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)

export const langGeneratedLiveActiveSkillLevel = snakeCase.table(
  'LangGeneratedLiveActiveSkillLevel',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)

export const langGeneratedLiveSpecialSkillLevel = snakeCase.table(
  'LangGeneratedLiveSpecialSkillLevel',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)

export const langGeneratedLiveActiveSkillEffect = snakeCase.table(
  'LangGeneratedLiveActiveSkillEffect',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)
