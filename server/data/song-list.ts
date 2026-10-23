import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { GameLocale } from '#shared/language'
import type { LocalizedText } from '#shared/game-data/localized-text.ts'
import type {
  SongConditionData,
  SongData,
  SongListPayload,
  SongMvCategoryData,
  SongOptionalText,
} from '#shared/game-data/songs.ts'
import { transformCharacters } from './converters/characters.ts'
import { transformSongData } from './converters/songs.ts'
import { createGameDatabase } from './database.ts'

function collectLocalizedText(
  value: LocalizedText | SongOptionalText | null,
  result: string[],
) {
  if (value)
    for (const locale of Object.keys(value) as GameLocale[]) {
      const text = value[locale]
      if (text !== null) result.push(text)
    }
}

function songSearchText(
  song: SongData,
  characterNames: LocalizedText[],
  conditions: SongConditionData[],
  mvCategories: SongMvCategoryData[],
) {
  const texts: string[] = []
  for (const value of [
    song.title,
    song.titleRuby,
    song.subtitle,
    song.description,
    song.lyricist,
    song.lyricistRuby,
    song.composer,
    song.composerRuby,
    song.arranger,
    song.arrangerRuby,
    song.lockDescription,
    song.singerName,
    song.singerNameRuby,
  ])
    collectLocalizedText(value, texts)
  for (const name of characterNames) collectLocalizedText(name, texts)
  for (const mv of song.musicVideos) {
    collectLocalizedText(mv.name, texts)
    collectLocalizedText(mv.description, texts)
  }
  for (const condition of conditions) {
    collectLocalizedText(condition.description, texts)
    collectLocalizedText(condition.detailDescription, texts)
  }
  for (const category of mvCategories) {
    collectLocalizedText(category.label, texts)
    collectLocalizedText(category.filterName, texts)
  }
  return [...new Set(texts.map((text) => text.toLowerCase()))].join(' ')
}

export function readSongList(): SongListPayload {
  const databasePath = resolve(process.cwd(), '.data/master.sqlite')
  console.info(`Loading song list from ${databasePath}`)
  let database: DatabaseSync | undefined
  try {
    database = new DatabaseSync(databasePath, { readOnly: true })
    const gameDatabase = createGameDatabase(database)
    const payload = transformSongData(gameDatabase)
    const characterIds = new Set(
      payload.songs.flatMap((song) => song.characterIds),
    )
    const allCharacters = transformCharacters(gameDatabase)
    const characterById = new Map(
      allCharacters.map((character) => [character.id, character]),
    )
    const characters = [...characterIds]
      .map((id) => {
        const character = characterById.get(id)
        if (!character)
          throw new Error(
            `Missing Character ${id} referenced by Music.character_ids`,
          )
        return {
          id: character.id,
          name: character.name,
          assetId: character.assetId,
          order: character.order,
        }
      })
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    const songs = payload.songs.map(
      ({
        titleRuby: _titleRuby,
        lyricistRuby: _lyricistRuby,
        composerRuby: _composerRuby,
        arrangerRuby: _arrangerRuby,
        singerNameRuby: _singerNameRuby,
        assetId: _assetId,
        mvThumbnailAssetId: _mvThumbnailAssetId,
        ...song
      }) => song,
    )
    const searchTextBySongId = Object.fromEntries(
      payload.songs.map((song) => {
        const characterNames = song.characterIds.flatMap((id) => {
          const character = characterById.get(id)
          return character ? [character.name] : []
        })
        const conditionGroupIds = new Set(
          [
            ...song.difficulties.map(
              (difficulty) => difficulty.unlockConditionGroupId,
            ),
            ...song.musicVideos.map((mv) => mv.conditionGroupId),
          ].filter((id): id is string => id !== null),
        )
        const conditions = [...conditionGroupIds].flatMap(
          (id) => payload.conditions[id] ?? [],
        )
        const mvCategories = [
          ...new Set(song.musicVideos.map((mv) => mv.categoryId)),
        ].flatMap((id) => {
          const category = payload.mvCategories[id]
          return category ? [category] : []
        })
        return [
          song.id,
          songSearchText(song, characterNames, conditions, mvCategories),
        ]
      }),
    )
    const result: SongListPayload = {
      ...payload,
      songs,
      characters,
      searchTextBySongId,
    }
    console.info(
      `Loaded ${songs.length} songs and ${characters.length} referenced characters`,
    )
    return result
  } catch (cause) {
    const error = new Error(`Unable to read song data from ${databasePath}`, {
      cause,
    })
    console.error(error)
    throw error
  } finally {
    database?.close()
  }
}
