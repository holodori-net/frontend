export const siteLocales = ['ja', 'en', 'zh-TW'] as const
export type SiteLocale = (typeof siteLocales)[number]

export const gameLocales = ['jpn', 'eng', 'ind', 'kor', 'cht', 'chs'] as const
export type GameLocale = (typeof gameLocales)[number]

export type PageKind = 'home' | 'cards' | 'settings'

const browserLanguageAliases: Record<string, SiteLocale> = {
  ja: 'ja',
  en: 'en',
  'zh-TW': 'zh-TW',
  'zh-Hant': 'zh-TW',
}

const browserLanguageToGameLocale: Record<string, GameLocale> = {
  ja: 'jpn',
  en: 'eng',
  id: 'ind',
  ko: 'kor',
  'zh-TW': 'cht',
  'zh-Hant': 'cht',
  'zh-CN': 'chs',
  'zh-Hans': 'chs',
}

export function isSiteLocale(value: string): value is SiteLocale {
  return siteLocales.includes(value as SiteLocale)
}

export function isGameLocale(value: string): value is GameLocale {
  return gameLocales.includes(value as GameLocale)
}

function parseSiteLocale(value: string | null | undefined): SiteLocale | null {
  return value && isSiteLocale(value) ? value : null
}

function parseGameLocale(value: string | null | undefined): GameLocale | null {
  return value && isGameLocale(value) ? value : null
}

export function resolveBrowserSiteLocale(
  browserLanguages: readonly string[],
): SiteLocale {
  for (const language of browserLanguages) {
    const normalized = language.replace('_', '-')
    const match = browserLanguageAliases[normalized]
    if (match) return match
    if (normalized.startsWith('zh-TW') || normalized.startsWith('zh-Hant')) {
      return 'zh-TW'
    }
    const baseLanguage = normalized.split('-')[0] ?? ''
    if (baseLanguage === 'ja' || baseLanguage === 'en') return baseLanguage
  }
  return 'ja'
}

export function resolveBrowserGameLocale(
  browserLanguages: readonly string[],
): GameLocale {
  for (const language of browserLanguages) {
    const normalized = language.replace('_', '-')
    const match = browserLanguageToGameLocale[normalized]
    if (match) return match
    const baseLanguage = normalized.split('-')[0] ?? ''
    const baseMatch = browserLanguageToGameLocale[baseLanguage]
    if (baseMatch) return baseMatch
  }
  return 'jpn'
}

export function resolveEntryLocales(
  browserLanguages: readonly string[],
  manualSiteLocale?: string | null | undefined,
  manualGameLocale?: string | null | undefined,
) {
  const savedSiteLocale = parseSiteLocale(manualSiteLocale)
  const savedGameLocale = parseGameLocale(manualGameLocale)
  return {
    siteLocale: savedSiteLocale
      ? savedSiteLocale
      : resolveBrowserSiteLocale(browserLanguages),
    gameLocale: savedGameLocale
      ? savedGameLocale
      : resolveBrowserGameLocale(browserLanguages),
  } satisfies { siteLocale: SiteLocale; gameLocale: GameLocale }
}

export function buildLocalizedPath(
  siteLocale: SiteLocale,
  gameLocale: GameLocale,
  page: PageKind,
) {
  const suffix = page === 'home' ? '' : `/${page}`
  return `/${siteLocale}/${gameLocale}${suffix}`
}

export function getManualPreferenceConflict(
  urlSiteLocale: SiteLocale,
  urlGameLocale: GameLocale,
  manualSiteLocale?: string | null | undefined,
  manualGameLocale?: string | null | undefined,
) {
  const savedSiteLocale = parseSiteLocale(manualSiteLocale)
  const savedGameLocale = parseGameLocale(manualGameLocale)
  const siteConflict = savedSiteLocale && savedSiteLocale !== urlSiteLocale
  const gameConflict = savedGameLocale && savedGameLocale !== urlGameLocale

  if (!siteConflict && !gameConflict) return null

  return {
    siteLocale: savedSiteLocale ?? urlSiteLocale,
    gameLocale: savedGameLocale ?? urlGameLocale,
  } satisfies { siteLocale: SiteLocale; gameLocale: GameLocale }
}
