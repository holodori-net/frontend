import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { siteLocales } from '../shared/language.ts'
import {
  SONG_LIST_FIELDS,
  type SongListSort,
} from '../shared/game-data/song-list.ts'

const sorts = [
  'order',
  'title',
  'startTime',
  'playingSeconds',
  'levelEasy',
  'levelNormal',
  'levelHard',
  'levelExpert',
  'notes',
] satisfies SongListSort[]

describe('song interface translations', () => {
  it.each(siteLocales)(
    'provides dynamic field and sort labels in %s',
    (locale) => {
      const messages = JSON.parse(
        readFileSync(
          new URL(`../i18n/locales/${locale}.json`, import.meta.url),
          'utf8',
        ),
      ).songList as {
        field: Record<string, string>
        sort: Record<string, string>
        none: string
        editRangeValue: string
      }

      for (const field of SONG_LIST_FIELDS) {
        expect(
          messages.field[field],
          `${locale}: songList.field.${field}`,
        ).toEqual(expect.stringMatching(/\S/))
      }
      for (const sort of sorts) {
        expect(messages.sort[sort], `${locale}: songList.sort.${sort}`).toEqual(
          expect.stringMatching(/\S/),
        )
      }
      expect(messages.none).toEqual(expect.stringMatching(/\S/))
      expect(messages.editRangeValue).toEqual(expect.stringMatching(/\S/))
    },
  )

  it.each(siteLocales)(
    'keeps shared card and song labels aligned in %s',
    (locale) => {
      const messages = JSON.parse(
        readFileSync(
          new URL(`../i18n/locales/${locale}.json`, import.meta.url),
          'utf8',
        ),
      ) as {
        cardList: Record<string, string>
        songList: Record<string, string>
      }
      for (const key of [
        'resetDisplay',
        'search',
        'character',
        'allCharacters',
        'sortLabel',
        'reset',
      ]) {
        expect(messages.songList[key], `${locale}: ${key}`).toBe(
          messages.cardList[key],
        )
      }
    },
  )
})
