import { describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import type { SQLInputValue } from 'node:sqlite'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { createGameDatabase } from '../../server/data/database.ts'
import { transformSongData } from '../../server/data/converters/songs.ts'
import {
  assetStreamingMute,
  condition,
  langCondition,
  langMusic,
  langMusicMv,
  langMusicMvCategory,
  liveCombo,
  liveScoreEvaluationRank,
  music,
  musicDifficulty,
  musicDifficultyChart,
  musicMv,
  musicMvCategory,
} from '../../server/data/schema/songs.ts'

const tables = [
  assetStreamingMute,
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
]

describe('transformSongData', () => {
  it('joins music, charts, MV metadata and referenced score/combo groups while retaining optional nulls', () => {
    const client = new DatabaseSync(':memory:')
    try {
      for (const table of tables) {
        const config = getTableConfig(table)
        const columns = config.columns
          .map(
            (column) =>
              `"${column.name}" ${column.getSQLType()}${column.notNull ? ' NOT NULL' : ''}${column.primary ? ' PRIMARY KEY' : ''}`,
          )
          .join(', ')
        client.exec(`CREATE TABLE "${config.name}" (${columns})`)
      }
      const insert = (
        table: (typeof tables)[number],
        values: Record<string, unknown>,
      ) => {
        const config = getTableConfig(table)
        const entries = Object.entries(values)
        client
          .prepare(
            `INSERT INTO "${config.name}" (${entries.map(([key]) => `"${key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}"`).join(',')}) VALUES (${entries.map(() => '?').join(',')})`,
          )
          .run(...entries.map(([, value]) => value as SQLInputValue))
      }
      const localized = (
        table:
          | typeof langMusic
          | typeof langMusicMv
          | typeof langMusicMvCategory
          | typeof langCondition,
        id: string,
        text: string | null = null,
      ) => {
        for (const language of ['jpn', 'eng', 'ind', 'kor', 'cht', 'chs'])
          insert(table, { language, id, text })
      }
      insert(music, {
        id: 'm0001',
        title_lang_id: 'title',
        title_ruby_lang_id: 'ruby',
        sub_title_lang_id: null,
        description_lang_id: null,
        lyricist_lang_id: null,
        lyricist_ruby_lang_id: null,
        composer_lang_id: null,
        composer_ruby_lang_id: null,
        arranger_lang_id: null,
        arranger_ruby_lang_id: null,
        jacket_asset_id: 'jacket',
        start_time: null,
        playing_seconds: 123,
        category_type: 1,
        live_score_coefficient_permil: null,
        single_live_score_evaluation_rank_group_id: 'score',
        multi_live_score_evaluation_rank_group_id: 'score',
        live_combo_group_id: 'combo',
        release_type: 1,
        required_release_item_quantity: null,
        lock_description_lang_id: null,
        is_highest_score_rating_target: null,
        is_tutorial: 1,
        mv_url: null,
        mv_thumbnail_asset_id: null,
        copyright: null,
        music_singer_type: 0,
        character_ids: '[]',
        character_group_display_name_lang_id: null,
        character_group_display_name_ruby_lang_id: null,
        chorus_start_millisecond: null,
        chorus_end_millisecond: null,
        asset_id: 'asset',
        order: 1,
      })
      insert(assetStreamingMute, { asset_id: 'music_short_m0001' })
      insert(assetStreamingMute, { asset_id: 'bgm_chr_profile_00001' })
      localized(langMusic, 'title', 'Title')
      localized(langMusic, 'ruby')
      insert(musicDifficulty, {
        music_id: 'm0001',
        difficulty_type: 2,
        difficulty_level: 8,
        chart_asset_id: 'chart',
        unlock_condition_group_id: null,
      })
      insert(musicDifficultyChart, {
        music_id: 'm0001',
        difficulty_type: 2,
        full_combo_note_count: 321,
        max_combo_count_reward_threshold: 300,
      })
      insert(musicMvCategory, {
        id: 'category',
        label_name_lang_id: 'label',
        is_default_for_compatible_device: 1,
        is_default_for_incompatible_device: null,
        is_display_filter: 1,
        filter_name_lang_id: null,
        order: 1,
      })
      localized(langMusicMvCategory, 'label', 'MV')
      insert(musicMv, {
        music_id: 'm0001',
        number: 1,
        music_mv_category_id: 'category',
        mv_asset_id: null,
        slide_mv_asset_id: null,
        slide_mv_asset_count: null,
        name_lang_id: null,
        thumbnail_asset_id: 'thumb',
        condition_group_id: null,
        description_lang_id: null,
        order: 1,
      })
      for (const rankType of [1, 2])
        insert(liveScoreEvaluationRank, {
          group_id: 'score',
          evaluation_rank_type: rankType,
          plus: 0,
          score: rankType === 1 ? null : '1000',
        })
      insert(liveCombo, {
        group_id: 'combo',
        combo_count_from: 0,
        score_up_permil: null,
      })
      const data = transformSongData(createGameDatabase(client))
      expect(data.songs[0]?.title.eng).toBe('Title')
      expect(data.songs[0]?.isStreamingMuted).toBe(false)
      insert(assetStreamingMute, { asset_id: 'music_short_asset' })
      expect(
        transformSongData(createGameDatabase(client)).songs[0]
          ?.isStreamingMuted,
      ).toBe(true)
      expect(data.songs[0]?.titleRuby.eng).toBeNull()
      expect(data.songs[0]?.difficulties).toEqual([
        {
          type: 2,
          level: 8,
          chartAssetId: 'chart',
          unlockConditionGroupId: null,
          fullComboNoteCount: 321,
          maxComboCountRewardThreshold: 300,
        },
      ])
      expect(data.songs[0]?.musicVideos[0]?.categoryId).toBe('category')
      expect(data.scoreRankGroups.score).toHaveLength(2)
      expect(data.comboGroups.combo?.[0]?.scoreUpPermil).toBeNull()
      expect(
        data.mvCategories.category?.isDefaultForIncompatibleDevice,
      ).toBeNull()
      client
        .prepare('DELETE FROM LangMusic WHERE id = ? AND language = ?')
        .run('title', 'eng')
      expect(() => transformSongData(createGameDatabase(client))).toThrow(
        'Missing eng translation in LangMusic for title (Music.title_lang_id in row m0001)',
      )
      client
        .prepare('INSERT INTO LangMusic (language, id, text) VALUES (?, ?, ?)')
        .run('eng', 'title', 'Title')
      client
        .prepare(
          'UPDATE LangMusic SET text = NULL WHERE id = ? AND language = ?',
        )
        .run('title', 'eng')
      expect(() => transformSongData(createGameDatabase(client))).toThrow(
        'Missing eng translation in LangMusic for title (Music.title_lang_id in row m0001)',
      )
      client
        .prepare('UPDATE LangMusic SET text = ? WHERE id = ? AND language = ?')
        .run('Title', 'title', 'eng')
      client
        .prepare('DELETE FROM LangMusic WHERE id = ? AND language = ?')
        .run('ruby', 'eng')
      expect(() => transformSongData(createGameDatabase(client))).toThrow(
        'Missing eng row in LangMusic for ruby (Music.title_ruby_lang_id in row m0001)',
      )
      client
        .prepare('INSERT INTO LangMusic (language, id, text) VALUES (?, ?, ?)')
        .run('eng', 'ruby', null)
      client.prepare('DELETE FROM MusicDifficultyChart').run()
      expect(() => transformSongData(createGameDatabase(client))).toThrow(
        'Missing MusicDifficultyChart row for MusicDifficulty m0001/2',
      )
      client
        .prepare(
          'INSERT INTO MusicDifficultyChart (music_id, difficulty_type, full_combo_note_count, max_combo_count_reward_threshold) VALUES (?, ?, ?, ?)',
        )
        .run('m0001', 2, 321, 300)
      client.prepare('DELETE FROM LiveScoreEvaluationRank').run()
      expect(() => transformSongData(createGameDatabase(client))).toThrow(
        'Missing LiveScoreEvaluationRank group score referenced by Music',
      )
      for (const rankType of [1, 2])
        client
          .prepare(
            'INSERT INTO LiveScoreEvaluationRank (group_id, evaluation_rank_type, plus, score) VALUES (?, ?, ?, ?)',
          )
          .run('score', rankType, 0, rankType === 1 ? null : '1000')
      client.prepare('DELETE FROM LiveCombo').run()
      expect(() => transformSongData(createGameDatabase(client))).toThrow(
        'Missing LiveCombo group combo referenced by Music',
      )
      client
        .prepare(
          'INSERT INTO LiveCombo (group_id, combo_count_from, score_up_permil) VALUES (?, ?, ?)',
        )
        .run('combo', 0, null)
      client
        .prepare(
          'UPDATE MusicDifficulty SET unlock_condition_group_id = ? WHERE music_id = ? AND difficulty_type = ?',
        )
        .run('unlock', 'm0001', 2)
      expect(() => transformSongData(createGameDatabase(client))).toThrow(
        'Missing Condition group unlock referenced by MusicDifficulty or MusicMv',
      )
      client
        .prepare(
          'UPDATE MusicDifficulty SET unlock_condition_group_id = NULL WHERE music_id = ? AND difficulty_type = ?',
        )
        .run('m0001', 2)
      client.prepare('DELETE FROM MusicMvCategory').run()
      expect(() => transformSongData(createGameDatabase(client))).toThrow(
        'Missing MusicMvCategory category referenced by MusicMv row m0001/1',
      )
    } finally {
      client.close()
    }
  })
})
