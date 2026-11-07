import { describe, expect, it } from 'vitest'
import {
  gameLocaleLanguages,
  gameLocales,
  siteLocaleLanguages,
  siteLocales,
} from '../shared/language'
import {
  formatSeoTitle,
  getCanonicalSeoPath,
  getSeoLinks,
  seoSiteName,
  type SeoRouteInput,
} from '../shared/seo'

const cardId = 'card-00015 3'
const origin = 'https://example.test/'

function input(
  siteLocale: SeoRouteInput['siteLocale'],
  gameLocale: SeoRouteInput['gameLocale'],
  page: SeoRouteInput['page'] = 'cards',
): SeoRouteInput {
  return {
    siteLocale,
    gameLocale,
    page,
    ...(page === 'cards' ? { cardId } : {}),
  }
}

describe('SEO route policy', () => {
  it('maps all 18 data page variants to six canonical representatives', () => {
    const canonicalByGameLocale: Record<string, string> = {
      jpn: '/ja/jpn',
      eng: '/en/eng',
      ind: '/en/ind',
      kor: '/en/kor',
      cht: '/zh-TW/cht',
      chs: '/zh-TW/chs',
    }

    for (const siteLocale of siteLocales) {
      for (const gameLocale of gameLocales) {
        for (const page of ['cards', 'songs', 'characters'] as const) {
          expect(getCanonicalSeoPath({ siteLocale, gameLocale, page })).toBe(
            `${canonicalByGameLocale[gameLocale]}/${page}`,
          )
        }
      }
    }
  })

  it('builds six unique reciprocal language alternates and x-default', () => {
    for (const siteLocale of siteLocales) {
      for (const gameLocale of gameLocales) {
        const links = getSeoLinks(input(siteLocale, gameLocale), origin)
        expect(links.canonical).toBe(
          `https://example.test${getCanonicalSeoPath(input(siteLocale, gameLocale))}/`,
        )
        expect(links.alternates).toHaveLength(7)
        expect(links.alternates.map(({ hreflang }) => hreflang)).toEqual([
          ...gameLocales.map((locale) => gameLocaleLanguages[locale]),
          'x-default',
        ])
        expect(
          new Set(links.alternates.map(({ hreflang }) => hreflang)).size,
        ).toBe(7)
        expect(links.alternates.map(({ href }) => href)).toContain(
          links.canonical,
        )
        expect(links.alternates.at(-1)).toEqual({
          hreflang: 'x-default',
          href: 'https://example.test/ja/jpn/cards/card-00015%203/',
        })
        for (const alternate of links.alternates.slice(0, -1)) {
          const [pathLocale, pathGameLocale] = new URL(alternate.href).pathname
            .split('/')
            .filter(Boolean)
          const reciprocal = getSeoLinks(
            input(
              pathLocale as SeoRouteInput['siteLocale'],
              pathGameLocale as SeoRouteInput['gameLocale'],
            ),
            origin,
          )
          expect(reciprocal.alternates).toEqual(links.alternates)
        }
      }
    }
  })

  it('uses three site-language canonical homes and keeps settings self-canonical', () => {
    const homePaths = siteLocales.map((siteLocale) =>
      getCanonicalSeoPath({
        ...input(siteLocale, 'jpn', 'home'),
        cardId: undefined,
      }),
    )
    expect(homePaths).toEqual(['/ja/jpn', '/en/eng', '/zh-TW/cht'])
    const homeLinks = getSeoLinks(input('zh-TW', 'chs', 'home'), origin)
    expect(homeLinks.canonical).toBe('https://example.test/zh-TW/cht/')
    expect(homeLinks.alternates.map(({ hreflang }) => hreflang)).toEqual([
      ...siteLocales.map((locale) => siteLocaleLanguages[locale]),
      'x-default',
    ])
    expect(homeLinks.alternates.map(({ href }) => href)).toContain(
      homeLinks.canonical,
    )
    expect(homeLinks.alternates.at(-1)?.href).toBe(
      'https://example.test/ja/jpn/',
    )

    const settings = getSeoLinks(input('en', 'ind', 'settings'), origin)
    expect(settings.canonical).toBe('https://example.test/en/ind/settings/')
    expect(settings.alternates).toEqual([])
  })

  it('encodes card IDs, normalizes an origin trailing slash, and formats titles', () => {
    const links = getSeoLinks(input('en', 'eng'), origin)
    expect(links.canonical).toBe(
      'https://example.test/en/eng/cards/card-00015%203/',
    )
    expect(links.alternates[0]?.href).toBe(
      'https://example.test/ja/jpn/cards/card-00015%203/',
    )
    expect(seoSiteName).toBe('holodori-net')
    expect(formatSeoTitle('Cards')).toBe('Cards | holodori-net')
  })
})
