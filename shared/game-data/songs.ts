import type { GameLocale } from '../language.ts'
import type { LocalizedText } from './localized-text.ts'

export type SongOptionalText = Record<GameLocale, string | null>

export interface SongDifficultyData {
  type: number
  level: number
  chartAssetId: string
  unlockConditionGroupId: string | null
  fullComboNoteCount: number
  maxComboCountRewardThreshold: number
}

export interface SongMusicVideoData {
  number: number
  categoryId: string
  assetId: string | null
  slideAssetId: string | null
  slideAssetCount: number | null
  name: SongOptionalText | null
  thumbnailAssetId: string
  conditionGroupId: string | null
  description: SongOptionalText | null
  order: number
}

export interface SongData {
  id: string
  title: LocalizedText
  titleRuby: SongOptionalText
  subtitle: SongOptionalText | null
  description: SongOptionalText | null
  lyricist: SongOptionalText | null
  lyricistRuby: SongOptionalText | null
  composer: SongOptionalText | null
  composerRuby: SongOptionalText | null
  arranger: SongOptionalText | null
  arrangerRuby: SongOptionalText | null
  jacketAssetId: string
  startTime: string | null
  playingSeconds: number
  categoryType: number
  scoreCoefficientPermil: number | null
  singleScoreRankGroupId: string
  multiScoreRankGroupId: string
  comboGroupId: string
  releaseType: number
  requiredReleaseItemQuantity: number | null
  lockDescription: SongOptionalText | null
  isHighestScoreRatingTarget: boolean | null
  isTutorial: boolean | null
  mvUrl: string | null
  mvThumbnailAssetId: string | null
  copyright: string | null
  musicSingerType: number
  characterIds: string[]
  singerName: SongOptionalText | null
  singerNameRuby: SongOptionalText | null
  chorusStartMillisecond: number | null
  chorusEndMillisecond: number | null
  assetId: string
  order: number
  difficulties: SongDifficultyData[]
  musicVideos: SongMusicVideoData[]
}

export interface SongScoreRankData {
  rankType: number
  plus: number
  score: string | null
}

export interface SongComboData {
  countFrom: number
  scoreUpPermil: number | null
}

export interface SongConditionData {
  number: number
  operatorType: number | null
  type: number
  resourceId1: string | null
  resourceId2: string | null
  minMaxType: number | null
  min: string | null
  max: string | null
  startTime: string | null
  endTime: string | null
  description: SongOptionalText | null
  detailDescription: SongOptionalText | null
}

export interface SongMvCategoryData {
  id: string
  label: SongOptionalText
  filterName: SongOptionalText | null
  isDefaultForCompatibleDevice: boolean | null
  isDefaultForIncompatibleDevice: boolean | null
  isDisplayFilter: boolean | null
  order: number
}

export interface SongDataPayload {
  songs: SongData[]
  scoreRankGroups: Record<string, SongScoreRankData[]>
  comboGroups: Record<string, SongComboData[]>
  conditions: Record<string, SongConditionData[]>
  mvCategories: Record<string, SongMvCategoryData>
}

export type SongListItemData = Omit<
  SongData,
  | 'titleRuby'
  | 'lyricistRuby'
  | 'composerRuby'
  | 'arrangerRuby'
  | 'singerNameRuby'
  | 'assetId'
  | 'mvThumbnailAssetId'
>

export interface SongListCharacter {
  id: string
  name: LocalizedText
  assetId: string | null
  order: number
}

export interface SongListPayload extends Omit<SongDataPayload, 'songs'> {
  songs: SongListItemData[]
  characters: SongListCharacter[]
  searchTextBySongId: Record<string, string>
}
