import type { RouteLocationNormalizedLoaded } from 'vue-router'

export const siteLocales = ['ja', 'en', 'zh-TW'] as const
export type SiteLocale = (typeof siteLocales)[number]

export const gameLocales = ['jpn', 'eng', 'ind', 'kor', 'cht', 'chs'] as const
export type GameLocale = (typeof gameLocales)[number]

export const htmlLanguages = [
  'ja',
  'en',
  'id',
  'ko',
  'zh-Hant-TW',
  'zh-Hans-CN',
] as const
export type HtmlLanguage = (typeof htmlLanguages)[number]

export const siteLocaleLanguages: Record<SiteLocale, HtmlLanguage> = {
  ja: 'ja',
  en: 'en',
  'zh-TW': 'zh-Hant-TW',
}

export const gameLocaleLanguages: Record<GameLocale, HtmlLanguage> = {
  jpn: 'ja',
  eng: 'en',
  ind: 'id',
  kor: 'ko',
  cht: 'zh-Hant-TW',
  chs: 'zh-Hans-CN',
}

export const siteLanguageMetadata: Record<
  SiteLocale,
  { language: HtmlLanguage; name: string }
> = {
  ja: { language: siteLocaleLanguages.ja, name: '日本語' },
  en: { language: siteLocaleLanguages.en, name: 'English' },
  'zh-TW': { language: siteLocaleLanguages['zh-TW'], name: '繁體中文' },
}

export const gameLanguageNames: Record<GameLocale, string> = {
  jpn: '日本語',
  eng: 'English',
  ind: 'Bahasa Indonesia',
  kor: '한국어',
  cht: '繁體中文',
  chs: '简体中文',
}

export const siteLanguageOptions = siteLocales.map((value) => ({
  value,
  label: siteLanguageMetadata[value].name,
  lang: siteLocaleLanguages[value],
}))
export const gameLanguageOptions = gameLocales.map((value) => ({
  value,
  label: gameLanguageNames[value],
  lang: gameLocaleLanguages[value],
}))

export function resolveLocalizedName(
  names: Readonly<Record<GameLocale, string>>,
  selectedLocale: GameLocale,
) {
  for (const locale of [selectedLocale, 'jpn', 'eng'] as const) {
    const text = names[locale]
    if (text) return { text, lang: gameLocaleLanguages[locale] }
  }
  return { text: '', lang: gameLocaleLanguages[selectedLocale] }
}

export const sitePages = ['home', 'cards', 'characters', 'settings'] as const
export type PageKind = (typeof sitePages)[number]
export const offlinePageKinds = [
  'home',
  'cards',
  'cardDetails',
  'characters',
] as const

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

export function buildCardDetailPath(
  siteLocale: SiteLocale,
  gameLocale: GameLocale,
  id: string,
) {
  return `/${siteLocale}/${gameLocale}/cards/${encodeURIComponent(id)}`
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

export function buildLocalizedRoute(
  siteLocale: SiteLocale,
  gameLocale: GameLocale,
  currentRoute: Pick<RouteLocationNormalizedLoaded, 'path' | 'query' | 'hash'>,
) {
  const segments = currentRoute.path.split('/').filter(Boolean)
  if (segments[0] && isSiteLocale(segments[0])) segments.shift()
  if (segments[0] && isGameLocale(segments[0])) segments.shift()
  const subpath = segments.join('/')
  return {
    path: `/${siteLocale}/${gameLocale}${subpath ? `/${subpath}` : ''}`,
    query: currentRoute.query,
    hash: currentRoute.hash,
  }
}
