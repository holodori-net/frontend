import { asc, eq, inArray, sql } from 'drizzle-orm'
import { gameLocales } from '#shared/language'
import type {
  SongDataPayload,
  SongOptionalText,
} from '#shared/game-data/songs.ts'
import type { GameDatabase } from '../database.ts'
import { localizedText } from '../common/localized-text.ts'
import { parseJsonArray } from '../common/json-array.ts'
import {
  music,
  langMusic,
  musicDifficulty,
  musicDifficultyChart,
  musicMv,
  langMusicMv,
  musicMvCategory,
  langMusicMvCategory,
  liveScoreEvaluationRank,
  liveCombo,
  condition,
  langCondition,
} from '../schema/songs.ts'

function optionalLocalizedText(
  rows: { language: string; text: string | null }[],
  id: string,
  context: {
    languageTable: string
    table: string
    field: string
    rowId: string
  },
): SongOptionalText {
  const values = new Map(rows.map((row) => [row.language, row.text]))
  return Object.fromEntries(
    gameLocales.map((locale) => {
      if (!values.has(locale))
        throw new Error(
          `Missing ${locale} row in ${context.languageTable} for ${id} (${context.table}.${context.field} in row ${context.rowId})`,
        )
      return [locale, values.get(locale) ?? null]
    }),
  ) as SongOptionalText
}

export function transformSongData(database: GameDatabase): SongDataPayload {
  const songs = database
    .select({
      id: music.id,
      titleLangId: music.titleLangId,
      titleRubyLangId: music.titleRubyLangId,
      subtitleLangId: music.subTitleLangId,
      descriptionLangId: music.descriptionLangId,
      lyricistLangId: music.lyricistLangId,
      lyricistRubyLangId: music.lyricistRubyLangId,
      composerLangId: music.composerLangId,
      composerRubyLangId: music.composerRubyLangId,
      arrangerLangId: music.arrangerLangId,
      arrangerRubyLangId: music.arrangerRubyLangId,
      jacketAssetId: music.jacketAssetId,
      startTime: music.startTime,
      playingSeconds: music.playingSeconds,
      categoryType: music.categoryType,
      scoreCoefficientPermil: music.liveScoreCoefficientPermil,
      singleScoreRankGroupId: music.singleLiveScoreEvaluationRankGroupId,
      multiScoreRankGroupId: music.multiLiveScoreEvaluationRankGroupId,
      comboGroupId: music.liveComboGroupId,
      releaseType: music.releaseType,
      requiredReleaseItemQuantity: music.requiredReleaseItemQuantity,
      lockDescriptionLangId: music.lockDescriptionLangId,
      isHighestScoreRatingTarget: music.isHighestScoreRatingTarget,
      isTutorial: music.isTutorial,
      mvUrl: music.mvUrl,
      mvThumbnailAssetId: music.mvThumbnailAssetId,
      copyright: music.copyright,
      musicSingerType: music.musicSingerType,
      characterIds: music.characterIds,
      singerNameLangId: music.characterGroupDisplayNameLangId,
      singerNameRubyLangId: music.characterGroupDisplayNameRubyLangId,
      chorusStartMillisecond: music.chorusStartMillisecond,
      chorusEndMillisecond: music.chorusEndMillisecond,
      assetId: music.assetId,
      order: music.order,
    })
    .from(music)
    .orderBy(asc(music.order), asc(music.id))
    .all()
  const musics = database
    .select({
      musicId: musicDifficulty.musicId,
      difficultyType: musicDifficulty.difficultyType,
      difficultyLevel: musicDifficulty.difficultyLevel,
      chartAssetId: musicDifficulty.chartAssetId,
      unlockConditionGroupId: musicDifficulty.unlockConditionGroupId,
    })
    .from(musicDifficulty)
    .orderBy(asc(musicDifficulty.musicId), asc(musicDifficulty.difficultyType))
    .all()
  const charts = database
    .select({
      musicId: musicDifficultyChart.musicId,
      difficultyType: musicDifficultyChart.difficultyType,
      fullComboNoteCount: musicDifficultyChart.fullComboNoteCount,
      maxComboCountRewardThreshold:
        musicDifficultyChart.maxComboCountRewardThreshold,
    })
    .from(musicDifficultyChart)
    .all()
  const mvs = database
    .select({
      musicId: musicMv.musicId,
      number: musicMv.number,
      musicMvCategoryId: musicMv.musicMvCategoryId,
      mvAssetId: musicMv.mvAssetId,
      slideMvAssetId: musicMv.slideMvAssetId,
      slideMvAssetCount: musicMv.slideMvAssetCount,
      nameLangId: musicMv.nameLangId,
      thumbnailAssetId: musicMv.thumbnailAssetId,
      conditionGroupId: musicMv.conditionGroupId,
      descriptionLangId: musicMv.descriptionLangId,
      order: musicMv.order,
    })
    .from(musicMv)
    .orderBy(asc(musicMv.musicId), asc(musicMv.order), asc(musicMv.number))
    .all()
  const usedCategoryIds = [...new Set(mvs.map((mv) => mv.musicMvCategoryId))]
  const categories = usedCategoryIds.length
    ? database
        .select({
          id: musicMvCategory.id,
          labelNameLangId: musicMvCategory.labelNameLangId,
          isDefaultForCompatibleDevice:
            musicMvCategory.isDefaultForCompatibleDevice,
          isDefaultForIncompatibleDevice:
            musicMvCategory.isDefaultForIncompatibleDevice,
          isDisplayFilter: musicMvCategory.isDisplayFilter,
          filterNameLangId: musicMvCategory.filterNameLangId,
          order: musicMvCategory.order,
        })
        .from(musicMvCategory)
        .where(inArray(musicMvCategory.id, usedCategoryIds))
        .orderBy(asc(musicMvCategory.order), asc(musicMvCategory.id))
        .all()
    : []
  const categoryIds = new Set(categories.map((item) => item.id))
  const languageQuery = (
    table:
      | typeof langMusic
      | typeof langMusicMv
      | typeof langMusicMvCategory
      | typeof langCondition,
  ) =>
    database
      .select({ language: table.language, text: table.text })
      .from(table)
      .where(eq(table.id, sql.placeholder('id')))
      .prepare()
  const musicText = languageQuery(langMusic)
  const mvText = languageQuery(langMusicMv)
  const categoryText = languageQuery(langMusicMvCategory)
  const conditionText = languageQuery(langCondition)
  const required = (
    query: ReturnType<typeof languageQuery>,
    id: string,
    sourceTable: string,
    languageTable: string,
    field: string,
    rowId: string,
  ) =>
    localizedText(query.all({ id }), id, {
      languageTable,
      table: sourceTable,
      field,
      rowId,
    })
  const optional = (
    query: ReturnType<typeof languageQuery>,
    id: string | null,
    sourceTable: string,
    languageTable: string,
    field: string,
    rowId: string,
  ): SongOptionalText | null =>
    id === null
      ? null
      : optionalLocalizedText(query.all({ id }), id, {
          languageTable,
          table: sourceTable,
          field,
          rowId,
        })

  const scoreGroups = new Set(
    songs.flatMap((song) => [
      song.singleScoreRankGroupId,
      song.multiScoreRankGroupId,
    ]),
  )
  const comboGroups = new Set(songs.map((song) => song.comboGroupId))
  const conditionGroups = new Set<string>()
  for (const difficulty of musics)
    if (difficulty.unlockConditionGroupId)
      conditionGroups.add(difficulty.unlockConditionGroupId)
  for (const mv of mvs)
    if (mv.conditionGroupId) conditionGroups.add(mv.conditionGroupId)
  const scoreRows = scoreGroups.size
    ? database
        .select({
          groupId: liveScoreEvaluationRank.groupId,
          evaluationRankType: liveScoreEvaluationRank.evaluationRankType,
          plus: liveScoreEvaluationRank.plus,
          score: liveScoreEvaluationRank.score,
        })
        .from(liveScoreEvaluationRank)
        .where(inArray(liveScoreEvaluationRank.groupId, [...scoreGroups]))
        .orderBy(
          asc(liveScoreEvaluationRank.groupId),
          asc(liveScoreEvaluationRank.evaluationRankType),
          asc(liveScoreEvaluationRank.plus),
        )
        .all()
    : []
  const comboRows = comboGroups.size
    ? database
        .select({
          groupId: liveCombo.groupId,
          comboCountFrom: liveCombo.comboCountFrom,
          scoreUpPermil: liveCombo.scoreUpPermil,
        })
        .from(liveCombo)
        .where(inArray(liveCombo.groupId, [...comboGroups]))
        .orderBy(asc(liveCombo.groupId), asc(liveCombo.comboCountFrom))
        .all()
    : []
  const conditionRows = conditionGroups.size
    ? database
        .select({
          groupId: condition.groupId,
          number: condition.number,
          operatorType: condition.operatorType,
          type: condition.type,
          resourceId1: condition.resourceId1,
          resourceId2: condition.resourceId2,
          minMaxType: condition.minMaxType,
          min: condition.min,
          max: condition.max,
          startTime: condition.startTime,
          endTime: condition.endTime,
          descriptionLangId: condition.descriptionLangId,
          detailDescriptionLangId: condition.detailDescriptionLangId,
        })
        .from(condition)
        .where(inArray(condition.groupId, [...conditionGroups]))
        .orderBy(asc(condition.groupId), asc(condition.number))
        .all()
    : []
  const groupBy = <T>(rows: T[], key: (row: T) => string) => {
    const result = new Map<string, T[]>()
    for (const row of rows) {
      const id = key(row)
      const group = result.get(id) ?? []
      group.push(row)
      result.set(id, group)
    }
    return result
  }
  const scoreMap = groupBy(scoreRows, (row) => row.groupId)
  const comboMap = groupBy(comboRows, (row) => row.groupId)
  const conditionMap = groupBy(conditionRows, (row) => row.groupId)
  for (const id of scoreGroups)
    if (!scoreMap.has(id))
      throw new Error(
        `Missing LiveScoreEvaluationRank group ${id} referenced by Music`,
      )
  for (const id of comboGroups)
    if (!comboMap.has(id))
      throw new Error(`Missing LiveCombo group ${id} referenced by Music`)
  for (const id of conditionGroups)
    if (!conditionMap.has(id))
      throw new Error(
        `Missing Condition group ${id} referenced by MusicDifficulty or MusicMv`,
      )
  for (const mv of mvs)
    if (!categoryIds.has(mv.musicMvCategoryId))
      throw new Error(
        `Missing MusicMvCategory ${mv.musicMvCategoryId} referenced by MusicMv row ${mv.musicId}/${mv.number}`,
      )
  const chartMap = new Map(
    charts.map((chart) => [`${chart.musicId}\0${chart.difficultyType}`, chart]),
  )
  const difficultyMap = groupBy(musics, (row) => row.musicId)
  const mvMap = groupBy(mvs, (row) => row.musicId)
  const conditionPayload = Object.fromEntries(
    [...conditionMap].map(([id, rows]) => [
      id,
      rows.map((row) => ({
        number: row.number,
        operatorType: row.operatorType,
        type: row.type,
        resourceId1: row.resourceId1,
        resourceId2: row.resourceId2,
        minMaxType: row.minMaxType,
        min: row.min,
        max: row.max,
        startTime: row.startTime,
        endTime: row.endTime,
        description: optional(
          conditionText,
          row.descriptionLangId,
          'Condition',
          'LangCondition',
          'description_lang_id',
          `${id}/${row.number}`,
        ),
        detailDescription: optional(
          conditionText,
          row.detailDescriptionLangId,
          'Condition',
          'LangCondition',
          'detail_description_lang_id',
          `${id}/${row.number}`,
        ),
      })),
    ]),
  )
  return {
    songs: songs.map((row) => ({
      id: row.id,
      title: required(
        musicText,
        row.titleLangId,
        'Music',
        'LangMusic',
        'title_lang_id',
        row.id,
      ),
      titleRuby: optional(
        musicText,
        row.titleRubyLangId,
        'Music',
        'LangMusic',
        'title_ruby_lang_id',
        row.id,
      )!,
      subtitle: optional(
        musicText,
        row.subtitleLangId,
        'Music',
        'LangMusic',
        'sub_title_lang_id',
        row.id,
      ),
      description: optional(
        musicText,
        row.descriptionLangId,
        'Music',
        'LangMusic',
        'description_lang_id',
        row.id,
      ),
      lyricist: optional(
        musicText,
        row.lyricistLangId,
        'Music',
        'LangMusic',
        'lyricist_lang_id',
        row.id,
      ),
      lyricistRuby: optional(
        musicText,
        row.lyricistRubyLangId,
        'Music',
        'LangMusic',
        'lyricist_ruby_lang_id',
        row.id,
      ),
      composer: optional(
        musicText,
        row.composerLangId,
        'Music',
        'LangMusic',
        'composer_lang_id',
        row.id,
      ),
      composerRuby: optional(
        musicText,
        row.composerRubyLangId,
        'Music',
        'LangMusic',
        'composer_ruby_lang_id',
        row.id,
      ),
      arranger: optional(
        musicText,
        row.arrangerLangId,
        'Music',
        'LangMusic',
        'arranger_lang_id',
        row.id,
      ),
      arrangerRuby: optional(
        musicText,
        row.arrangerRubyLangId,
        'Music',
        'LangMusic',
        'arranger_ruby_lang_id',
        row.id,
      ),
      jacketAssetId: row.jacketAssetId,
      startTime: row.startTime,
      playingSeconds: row.playingSeconds,
      categoryType: row.categoryType,
      scoreCoefficientPermil: row.scoreCoefficientPermil,
      singleScoreRankGroupId: row.singleScoreRankGroupId,
      multiScoreRankGroupId: row.multiScoreRankGroupId,
      comboGroupId: row.comboGroupId,
      releaseType: row.releaseType,
      requiredReleaseItemQuantity: row.requiredReleaseItemQuantity,
      lockDescription: optional(
        musicText,
        row.lockDescriptionLangId,
        'Music',
        'LangMusic',
        'lock_description_lang_id',
        row.id,
      ),
      isHighestScoreRatingTarget:
        row.isHighestScoreRatingTarget === null
          ? null
          : Boolean(row.isHighestScoreRatingTarget),
      isTutorial: row.isTutorial === null ? null : Boolean(row.isTutorial),
      mvUrl: row.mvUrl,
      mvThumbnailAssetId: row.mvThumbnailAssetId,
      copyright: row.copyright,
      musicSingerType: row.musicSingerType,
      characterIds: parseJsonArray(row.characterIds, {
        table: 'Music',
        field: 'character_ids',
        rowId: row.id,
      }),
      singerName: optional(
        musicText,
        row.singerNameLangId,
        'Music',
        'LangMusic',
        'character_group_display_name_lang_id',
        row.id,
      ),
      singerNameRuby: optional(
        musicText,
        row.singerNameRubyLangId,
        'Music',
        'LangMusic',
        'character_group_display_name_ruby_lang_id',
        row.id,
      ),
      chorusStartMillisecond: row.chorusStartMillisecond,
      chorusEndMillisecond: row.chorusEndMillisecond,
      assetId: row.assetId,
      order: row.order,
      difficulties: (difficultyMap.get(row.id) ?? []).map((difficulty) => {
        const chart = chartMap.get(`${row.id}\0${difficulty.difficultyType}`)
        if (!chart)
          throw new Error(
            `Missing MusicDifficultyChart row for MusicDifficulty ${row.id}/${difficulty.difficultyType}`,
          )
        return {
          type: difficulty.difficultyType,
          level: difficulty.difficultyLevel,
          chartAssetId: difficulty.chartAssetId,
          unlockConditionGroupId: difficulty.unlockConditionGroupId,
          fullComboNoteCount: chart.fullComboNoteCount,
          maxComboCountRewardThreshold: chart.maxComboCountRewardThreshold,
        }
      }),
      musicVideos: (mvMap.get(row.id) ?? []).map((mv) => ({
        number: mv.number,
        categoryId: mv.musicMvCategoryId,
        assetId: mv.mvAssetId,
        slideAssetId: mv.slideMvAssetId,
        slideAssetCount: mv.slideMvAssetCount,
        name: optional(
          mvText,
          mv.nameLangId,
          'MusicMv',
          'LangMusicMv',
          'name_lang_id',
          `${row.id}/${mv.number}`,
        ),
        thumbnailAssetId: mv.thumbnailAssetId,
        conditionGroupId: mv.conditionGroupId,
        description: optional(
          mvText,
          mv.descriptionLangId,
          'MusicMv',
          'LangMusicMv',
          'description_lang_id',
          `${row.id}/${mv.number}`,
        ),
        order: mv.order,
      })),
    })),
    scoreRankGroups: Object.fromEntries(
      [...scoreMap].map(([id, rows]) => [
        id,
        rows.map((row) => ({
          rankType: row.evaluationRankType,
          plus: row.plus,
          score: row.score,
        })),
      ]),
    ),
    comboGroups: Object.fromEntries(
      [...comboMap].map(([id, rows]) => [
        id,
        rows.map((row) => ({
          countFrom: row.comboCountFrom,
          scoreUpPermil: row.scoreUpPermil,
        })),
      ]),
    ),
    conditions: conditionPayload,
    mvCategories: Object.fromEntries(
      categories.map((row) => [
        row.id,
        {
          id: row.id,
          label: required(
            categoryText,
            row.labelNameLangId,
            'MusicMvCategory',
            'LangMusicMvCategory',
            'label_name_lang_id',
            row.id,
          ),
          filterName: optional(
            categoryText,
            row.filterNameLangId,
            'MusicMvCategory',
            'LangMusicMvCategory',
            'filter_name_lang_id',
            row.id,
          ),
          isDefaultForCompatibleDevice:
            row.isDefaultForCompatibleDevice === null
              ? null
              : Boolean(row.isDefaultForCompatibleDevice),
          isDefaultForIncompatibleDevice:
            row.isDefaultForIncompatibleDevice === null
              ? null
              : Boolean(row.isDefaultForIncompatibleDevice),
          isDisplayFilter:
            row.isDisplayFilter === null ? null : Boolean(row.isDisplayFilter),
          order: row.order,
        },
      ]),
    ),
  }
}
