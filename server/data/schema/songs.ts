import { primaryKey, snakeCase, text, integer } from 'drizzle-orm/sqlite-core'

export const music = snakeCase.table('Music', {
  id: text().notNull().primaryKey(),
  titleLangId: text().notNull(),
  titleRubyLangId: text().notNull(),
  subTitleLangId: text(),
  descriptionLangId: text(),
  lyricistLangId: text(),
  lyricistRubyLangId: text(),
  composerLangId: text(),
  composerRubyLangId: text(),
  arrangerLangId: text(),
  arrangerRubyLangId: text(),
  jacketAssetId: text().notNull(),
  startTime: text(),
  playingSeconds: integer().notNull(),
  categoryType: integer().notNull(),
  liveScoreCoefficientPermil: integer(),
  singleLiveScoreEvaluationRankGroupId: text().notNull(),
  multiLiveScoreEvaluationRankGroupId: text().notNull(),
  liveComboGroupId: text().notNull(),
  releaseType: integer().notNull(),
  requiredReleaseItemQuantity: integer(),
  lockDescriptionLangId: text(),
  isHighestScoreRatingTarget: integer(),
  isTutorial: integer(),
  mvUrl: text(),
  mvThumbnailAssetId: text(),
  copyright: text(),
  musicSingerType: integer().notNull(),
  characterIds: text(),
  characterGroupDisplayNameLangId: text(),
  characterGroupDisplayNameRubyLangId: text(),
  chorusStartMillisecond: integer(),
  chorusEndMillisecond: integer(),
  assetId: text().notNull(),
  order: integer().notNull(),
})
export const langMusic = snakeCase.table(
  'LangMusic',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)
export const musicDifficulty = snakeCase.table(
  'MusicDifficulty',
  {
    musicId: text().notNull(),
    difficultyType: integer().notNull(),
    difficultyLevel: integer().notNull(),
    chartAssetId: text().notNull(),
    unlockConditionGroupId: text(),
  },
  (table) => [primaryKey({ columns: [table.musicId, table.difficultyType] })],
)
export const musicDifficultyChart = snakeCase.table(
  'MusicDifficultyChart',
  {
    musicId: text().notNull(),
    difficultyType: integer().notNull(),
    fullComboNoteCount: integer().notNull(),
    maxComboCountRewardThreshold: integer().notNull(),
  },
  (table) => [primaryKey({ columns: [table.musicId, table.difficultyType] })],
)
export const musicMv = snakeCase.table(
  'MusicMv',
  {
    musicId: text().notNull(),
    number: integer().notNull(),
    musicMvCategoryId: text().notNull(),
    mvAssetId: text(),
    slideMvAssetId: text(),
    slideMvAssetCount: integer(),
    nameLangId: text(),
    thumbnailAssetId: text().notNull(),
    conditionGroupId: text(),
    descriptionLangId: text(),
    order: integer().notNull(),
  },
  (table) => [primaryKey({ columns: [table.musicId, table.number] })],
)
export const langMusicMv = snakeCase.table(
  'LangMusicMv',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)
export const musicMvCategory = snakeCase.table('MusicMvCategory', {
  id: text().notNull().primaryKey(),
  labelNameLangId: text().notNull(),
  isDefaultForCompatibleDevice: integer(),
  isDefaultForIncompatibleDevice: integer(),
  isDisplayFilter: integer(),
  filterNameLangId: text(),
  order: integer().notNull(),
})
export const langMusicMvCategory = snakeCase.table(
  'LangMusicMvCategory',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)
export const liveScoreEvaluationRank = snakeCase.table(
  'LiveScoreEvaluationRank',
  {
    groupId: text().notNull(),
    evaluationRankType: integer().notNull(),
    plus: integer().notNull(),
    score: text(),
  },
  (table) => [
    primaryKey({
      columns: [table.groupId, table.evaluationRankType, table.plus],
    }),
  ],
)
export const liveCombo = snakeCase.table(
  'LiveCombo',
  {
    groupId: text().notNull(),
    comboCountFrom: integer().notNull(),
    scoreUpPermil: integer(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.comboCountFrom] })],
)
export const condition = snakeCase.table(
  'Condition',
  {
    groupId: text().notNull(),
    number: integer().notNull(),
    operatorType: integer(),
    type: integer().notNull(),
    resourceId1: text(),
    resourceId2: text(),
    minMaxType: integer(),
    min: text(),
    max: text(),
    startTime: text(),
    endTime: text(),
    descriptionLangId: text(),
    detailDescriptionLangId: text(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.number] })],
)
export const langCondition = snakeCase.table(
  'LangCondition',
  {
    language: text().notNull(),
    id: text().notNull(),
    text: text(),
  },
  (table) => [primaryKey({ columns: [table.language, table.id] })],
)
