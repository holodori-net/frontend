import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { CharacterData } from '#shared/game-data/characters.ts'
import { getMemberThemeAssets, type MemberTheme } from '#shared/theme'
import { transformCharacters } from './converters/characters.ts'
import { createGameDatabase } from './database.ts'

type ThemeCharacter = Pick<
  CharacterData,
  | 'id'
  | 'name'
  | 'order'
  | 'assetId'
  | 'color1'
  | 'color2'
  | 'color3'
  | 'color4'
>

function themeColor(value: string, id: string, field: string): string {
  const hex = /^#?([\da-f]{6})$/i.exec(value)
  if (!hex)
    throw new Error(`Invalid color in Character.${field} for ${id}: ${value}`)
  return `#${hex[1]!.toUpperCase()}`
}

export function projectMemberThemes(
  characters: readonly ThemeCharacter[],
): MemberTheme[] {
  return characters
    .filter((character) => Boolean(character.color1))
    .map(({ id, name, order, assetId, color1, color2, color3, color4 }) => {
      const main = themeColor(color1!, id, 'color1')
      return {
        id,
        name,
        order,
        color1: main,
        color2: color2 ? themeColor(color2, id, 'color2') : main,
        color3: color3 ? themeColor(color3, id, 'color3') : main,
        color4: color4 ? themeColor(color4, id, 'color4') : main,
        assets: getMemberThemeAssets(assetId),
      }
    })
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
}

export function readMemberThemes(): MemberTheme[] {
  const databasePath = resolve(process.cwd(), '.data/master.sqlite')
  console.info(`Loading member themes from ${databasePath}`)

  let database: DatabaseSync | undefined
  try {
    database = new DatabaseSync(databasePath, { readOnly: true })
    const themes = projectMemberThemes(
      transformCharacters(createGameDatabase(database)),
    )
    console.info(`Loaded ${themes.length} member themes`)
    return themes
  } catch (cause) {
    const error = new Error(
      `Unable to read member themes from ${databasePath}`,
      { cause },
    )
    console.error(error)
    throw error
  } finally {
    database?.close()
  }
}
