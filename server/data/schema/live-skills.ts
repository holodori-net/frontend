import { primaryKey, snakeCase, text, integer } from 'drizzle-orm/sqlite-core'

export const costume = snakeCase.table('Costume', {
  id: text().notNull().primaryKey(),
  characterId: text().notNull(),
  assetId: text().notNull(),
  nameLangId: text().notNull(),
  liveLeaderSkillId: text(),
})

export const langCostume = snakeCase.table(
  'LangCostume',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)

export const liveLeaderSkill = snakeCase.table('LiveLeaderSkill', {
  id: text().notNull().primaryKey(),
  liveSkillTriggerGroupId: text(),
  livePassiveSkillEffectGroupId: text().notNull(),
  additionalLiveSkillTriggerGroupId: text(),
  additionalLivePassiveSkillEffectGroupId: text(),
})

export const livePassiveSkillEffect = snakeCase.table(
  'LivePassiveSkillEffect',
  {
    groupId: text().notNull(),
    number: integer().notNull(),
    type: integer().notNull(),
    value: text(),
    liveSkillEffectTargetId: text(),
    resourceType: integer(),
    resourceIds: text(),
    descriptionLangId: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.number] })],
)

export const liveSkillTrigger = snakeCase.table(
  'LiveSkillTrigger',
  {
    groupId: text().notNull(),
    number: integer().notNull(),
    type: integer().notNull(),
    threshold: text(),
    characterIds: text(),
    characterGroupingId: text(),
    musicId: text(),
    cardAttributeType: integer(),
    liveNoteJudgementType: integer(),
    descriptionLangId: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.number] })],
)

export const langGeneratedLivePassiveSkillEffect = snakeCase.table(
  'LangGeneratedLivePassiveSkillEffect',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)

export const langGeneratedLiveSkillTrigger = snakeCase.table(
  'LangGeneratedLiveSkillTrigger',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)
