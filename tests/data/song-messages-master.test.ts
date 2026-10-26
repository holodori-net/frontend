import { existsSync, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'

const sourcePath = new URL('../../.data/master.sqlite', import.meta.url)
const languages = [
  ['zh-TW', 'cht'],
  ['ja', 'jpn'],
  ['en', 'eng'],
] as const

function normalizeWording(value: unknown): unknown {
  return typeof value === 'string'
    ? value.replace(/\s+/gu, '').replace(/Lv\./gu, 'Lv')
    : value
}

function expectGameWording(
  row: Record<string, unknown> | undefined,
  text: string | undefined,
  context: string,
) {
  expect(row, context).toBeDefined()
  expect(normalizeWording(row?.text), context).toEqual(normalizeWording(text))
}

describe.skipIf(!existsSync(sourcePath))(
  'master song interface wording',
  () => {
    it.each(languages)(
      'uses the game terminology in %s',
      (siteLocale, gameLocale) => {
        const messages = JSON.parse(
          readFileSync(
            new URL(`../../i18n/locales/${siteLocale}.json`, import.meta.url),
            'utf8',
          ),
        ) as {
          songs: string
          songList: {
            categoryLabel: string
            difficultyLabel: string
            levelLabel: string
            mvLabel: string
            liveLabel: string
            field: Record<string, string>
            sort: Record<string, string>
            category: Record<string, string>
            difficulty: Record<string, string>
            unlockType: Record<string, string>
            video: Record<string, string>
          }
        }
        const labels = messages.songList
        const source = new DatabaseSync(sourcePath, { readOnly: true })

        try {
          const common = source.prepare(
            'SELECT text FROM LangClientCommon WHERE language = ? AND client_id = ?',
          )
          const commonLabels = [
            [messages.songs, '10435095945216'],
            [labels.categoryLabel, '137989107996083'],
            [labels.field.category, '137989107996083'],
            [labels.field.singer, '179181927588882'],
            [labels.levelLabel, '248908092650803'],
            [labels.field.charts, '248908092650803'],
            [labels.difficultyLabel, '806106654334976'],
            [labels.sort.startTime, '231740691275778'],
            [labels.category['1'], '205926950428672'],
            [labels.category['2'], '205993312706560'],
            [labels.difficulty['1'], '644284026118144'],
            [labels.difficulty['2'], '644324887027712'],
            [labels.difficulty['3'], '644364548366336'],
            [labels.difficulty['4'], '644391358357504'],
          ] as const
          for (const [text, id] of commonLabels) {
            expectGameWording(
              common.get(gameLocale, id),
              text,
              `LangClientCommon: ${id}`,
            )
          }

          const video = source.prepare(
            'SELECT text FROM LangMusicMvCategory WHERE language = ? AND id = ?',
          )
          for (const [text, id] of [
            [labels.mvLabel, 'la-music_mv_category-mv'],
            [labels.liveLabel, 'la-music_mv_category-live'],
            [labels.video.mv, 'la-music_mv_category-filter-mv'],
            [labels.video.live, 'la-music_mv_category-filter-live'],
          ] as const) {
            expectGameWording(
              video.get(gameLocale, id),
              text,
              `LangMusicMvCategory: ${id}`,
            )
          }

          const unlock = source.prepare(
            'SELECT text FROM LangResourceObtainmentRoute WHERE language = ? AND id = ?',
          )
          for (const [text, id] of [
            [
              labels.unlockType.member,
              'la-resource_obtainment_route-character_quest',
            ],
            [labels.unlockType.main, 'la-resource_obtainment_route-main_quest'],
            [labels.unlockType.shop, 'la-resource_obtainment_route-music_shop'],
          ] as const) {
            expectGameWording(
              unlock.get(gameLocale, id),
              text,
              `LangResourceObtainmentRoute: ${id}`,
            )
          }
        } finally {
          source.close()
        }
      },
    )
  },
)
