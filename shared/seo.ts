import {
  buildCardDetailPath,
  buildLocalizedPath,
  gameLocaleLanguages,
  gameLocales,
  siteLocaleLanguages,
  siteLocales,
  type GameLocale,
  type PageKind,
  type SiteLocale,
} from './language.ts'

export const seoSiteName = 'holodori-net'

const canonicalSiteLocaleByGameLocale: Record<GameLocale, SiteLocale> = {
  jpn: 'ja',
  eng: 'en',
  ind: 'en',
  kor: 'en',
  cht: 'zh-TW',
  chs: 'zh-TW',
}

const canonicalGameLocaleBySiteLocale: Record<SiteLocale, GameLocale> = {
  ja: 'jpn',
  en: 'eng',
  'zh-TW': 'cht',
}

export interface SeoRouteInput {
  siteLocale: SiteLocale
  gameLocale: GameLocale
  page: PageKind
  cardId?: string
}

export interface SeoAlternateLink {
  hreflang: string
  href: string
}

export interface SeoLinks {
  canonical: string
  alternates: SeoAlternateLink[]
}

export function formatSeoTitle(title: string) {
  return `${title} | ${seoSiteName}`
}

function getRoutePath(
  siteLocale: SiteLocale,
  gameLocale: GameLocale,
  page: PageKind,
  cardId?: string,
) {
  if (page === 'cards' && cardId !== undefined) {
    return buildCardDetailPath(siteLocale, gameLocale, cardId)
  }
  return buildLocalizedPath(siteLocale, gameLocale, page)
}

export function getCanonicalSeoPath(input: SeoRouteInput) {
  if (input.page === 'home') {
    const siteLocale = input.siteLocale
    return getRoutePath(
      siteLocale,
      canonicalGameLocaleBySiteLocale[siteLocale],
      input.page,
    )
  }

  if (input.page === 'settings') {
    return getRoutePath(input.siteLocale, input.gameLocale, input.page)
  }

  return getRoutePath(
    canonicalSiteLocaleByGameLocale[input.gameLocale],
    input.gameLocale,
    input.page,
    input.cardId,
  )
}

function withTrailingSlash(path: string) {
  return path.endsWith('/') ? path : `${path}/`
}

export function getSeoLinks(input: SeoRouteInput, origin: string): SeoLinks {
  const canonicalPath = getCanonicalSeoPath(input)
  const alternates: SeoAlternateLink[] = []

  if (input.page === 'home') {
    for (const siteLocale of siteLocales) {
      const path = getCanonicalSeoPath({ ...input, siteLocale })
      alternates.push({
        hreflang: siteLocaleLanguages[siteLocale],
        href: new URL(withTrailingSlash(path), origin).href,
      })
    }
    alternates.push({
      hreflang: 'x-default',
      href: new URL(
        withTrailingSlash(
          getCanonicalSeoPath({
            ...input,
            siteLocale: 'ja',
            gameLocale: 'jpn',
          }),
        ),
        origin,
      ).href,
    })
  } else if (input.page !== 'settings') {
    for (const gameLocale of gameLocales) {
      const path = getCanonicalSeoPath({ ...input, gameLocale })
      alternates.push({
        hreflang: gameLocaleLanguages[gameLocale],
        href: new URL(withTrailingSlash(path), origin).href,
      })
    }
    alternates.push({
      hreflang: 'x-default',
      href: new URL(
        withTrailingSlash(
          getCanonicalSeoPath({
            ...input,
            siteLocale: 'ja',
            gameLocale: 'jpn',
          }),
        ),
        origin,
      ).href,
    })
  }

  return {
    canonical: new URL(withTrailingSlash(canonicalPath), origin).href,
    alternates,
  }
}
