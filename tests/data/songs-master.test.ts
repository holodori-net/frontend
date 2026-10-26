import { existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { gameLocales } from '#shared/language'
import { readSongList } from '../../server/data/song-list.ts'
import { transformSongData } from '../../server/data/converters/songs.ts'
import { createGameDatabase } from '../../server/data/database.ts'

describe.skipIf(!existsSync('.data/master.sqlite'))(
  'local master song list',
  () => {
    it('matches source cardinalities and indexes localized readings only', () => {
      const source = new DatabaseSync('.data/master.sqlite', { readOnly: true })
      try {
        const count = (table: string) =>
          source.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get()!
            .count as number
        const songCount = count('Music')
        const difficultyCount = count('MusicDifficulty')
        const scoreGroupIds = source
          .prepare(
            'SELECT DISTINCT single_live_score_evaluation_rank_group_id AS id FROM Music UNION SELECT DISTINCT multi_live_score_evaluation_rank_group_id AS id FROM Music',
          )
          .all()
          .map((row) => row.id as string)
        const comboGroupIds = source
          .prepare('SELECT DISTINCT live_combo_group_id AS id FROM Music')
          .all()
          .map((row) => row.id as string)
        const categoryIds = source
          .prepare('SELECT DISTINCT music_mv_category_id AS id FROM MusicMv')
          .all()
          .map((row) => row.id as string)
        const payload = readSongList()
        const fullPayload = transformSongData(createGameDatabase(source))
        expect(payload.songs).toHaveLength(songCount)
        const streamingMuteAssetIds = new Set(
          source
            .prepare('SELECT asset_id FROM AssetStreamingMute')
            .all()
            .map((row) => row.asset_id as string),
        )
        for (const song of payload.songs) {
          const sourceSong = source
            .prepare('SELECT asset_id FROM Music WHERE id = ?')
            .get(song.id)!
          const expected = streamingMuteAssetIds.has(
            `music_short_${sourceSong.asset_id}`,
          )
          expect(song.isStreamingMuted).toBe(expected)
          expect(
            fullPayload.songs.find((item) => item.id === song.id)
              ?.isStreamingMuted,
          ).toBe(expected)
        }
        expect(
          payload.songs.reduce(
            (sum, song) => sum + song.difficulties.length,
            0,
          ),
        ).toBe(difficultyCount)
        for (const song of payload.songs) {
          const sourceCharts = source
            .prepare(
              'SELECT d.difficulty_type, d.difficulty_level, d.chart_asset_id, d.unlock_condition_group_id, c.full_combo_note_count, c.max_combo_count_reward_threshold FROM MusicDifficulty d JOIN MusicDifficultyChart c USING (music_id, difficulty_type) WHERE d.music_id = ? ORDER BY d.difficulty_type',
            )
            .all(song.id)
          expect(song.difficulties).toEqual(
            sourceCharts.map((row) => ({
              type: row.difficulty_type,
              level: row.difficulty_level,
              chartAssetId: row.chart_asset_id,
              unlockConditionGroupId: row.unlock_condition_group_id,
              fullComboNoteCount: row.full_combo_note_count,
              maxComboCountRewardThreshold:
                row.max_combo_count_reward_threshold,
            })),
          )
        }
        expect(Object.keys(payload.scoreRankGroups).sort()).toEqual(
          scoreGroupIds.sort(),
        )
        expect(Object.keys(payload.comboGroups).sort()).toEqual(
          comboGroupIds.sort(),
        )
        expect(Object.keys(payload.mvCategories).sort()).toEqual(
          categoryIds.sort(),
        )

        const timedSong = source
          .prepare(
            'SELECT id, start_time FROM Music WHERE start_time IS NOT NULL ORDER BY `order`, id LIMIT 1',
          )
          .get()!
        const song = payload.songs.find((item) => item.id === timedSong.id)!
        expect(song.startTime).toBe(timedSong.start_time)

        const rubySource = source
          .prepare(
            'SELECT id, title_ruby_lang_id FROM Music WHERE title_ruby_lang_id IS NOT NULL ORDER BY `order`, id LIMIT 1',
          )
          .get()!
        const rubySong = fullPayload.songs.find(
          (item) => item.id === rubySource.id,
        )!
        const rubyLangId = rubySource.title_ruby_lang_id
        if (typeof rubyLangId !== 'string') {
          throw new Error('Music.title_ruby_lang_id must be a string')
        }
        const rubyRows = source
          .prepare('SELECT language, text FROM LangMusic WHERE id = ?')
          .all(rubyLangId)
        for (const locale of gameLocales) {
          const sourceText =
            rubyRows.find((row) => row.language === locale)?.text ?? null
          if (sourceText !== null && typeof sourceText !== 'string') {
            throw new Error(
              `LangMusic text for ${locale} must be a string or null`,
            )
          }
          expect(rubySong.titleRuby[locale]).toBe(sourceText)
          if (sourceText !== null)
            expect(payload.searchTextBySongId[rubySong.id]).toContain(
              sourceText.toLowerCase(),
            )
        }

        const nullArranger = source
          .prepare(
            `SELECT m.id, m.arranger_lang_id FROM Music m WHERE m.arranger_lang_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM LangMusic l WHERE l.id = m.arranger_lang_id AND l.text IS NOT NULL) ORDER BY m.id LIMIT 1`,
          )
          .get()!
        const arrangerSong = fullPayload.songs.find(
          (item) => item.id === nullArranger.id,
        )!
        expect(arrangerSong.arranger).toEqual(
          Object.fromEntries(gameLocales.map((locale) => [locale, null])),
        )
        const searchText = payload.searchTextBySongId[arrangerSong.id]!
        expect(searchText).not.toContain(
          nullArranger.arranger_lang_id as string,
        )
        expect(searchText).not.toContain(arrangerSong.id)
        const arrangerRubyId = source
          .prepare('SELECT title_ruby_lang_id FROM Music WHERE id = ?')
          .get(arrangerSong.id)!.title_ruby_lang_id as string
        expect(searchText).not.toContain(arrangerRubyId)
        expect(payload.characters.length).toBeGreaterThan(0)
        for (const character of payload.characters) {
          const referringSong = payload.songs.find((item) =>
            item.characterIds.includes(character.id),
          )!
          const referringSearch = payload.searchTextBySongId[referringSong.id]!
          expect(referringSearch).not.toContain(character.id)
          for (const locale of gameLocales)
            expect(referringSearch).toContain(
              character.name[locale].toLowerCase(),
            )
        }
        expect(
          payload.songs.every(
            (item) =>
              !('titleRuby' in item) &&
              !('assetId' in item) &&
              !('mvThumbnailAssetId' in item),
          ),
        ).toBe(true)
      } finally {
        source.close()
      }
    })
  },
)
