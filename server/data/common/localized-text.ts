import { gameLocales } from '#shared/language'
import type { LocalizedText } from '#shared/game-data/localized-text.ts'
import type { SourceFieldContext } from './source-context.ts'

interface LocalizedTextRow {
  language: string
  text: string | null
}

interface LocalizedTextContext extends SourceFieldContext {
  languageTable: string
}

export function localizedText(
  rows: LocalizedTextRow[],
  id: string,
  context: LocalizedTextContext,
): LocalizedText {
  return Object.fromEntries(
    gameLocales.map((locale) => {
      const translation = rows.find((row) => row.language === locale)
      if (!translation || translation.text === null) {
        throw new Error(
          `Missing ${locale} translation in ${context.languageTable} for ${id} (${context.table}.${context.field} in row ${context.rowId})`,
        )
      }
      return [locale, translation.text]
    }),
  ) as LocalizedText
}
