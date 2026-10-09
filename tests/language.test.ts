import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  buildLocalizedPath,
  buildLocalizedRoute,
  gameLocales,
  getManualPreferenceConflict,
  resolveBrowserGameLocale,
  resolveBrowserSiteLocale,
  resolveEntryLocales,
  siteLocales,
} from '../shared/language'

describe('language resolution', () => {
  it('uses a manual choice per language dimension without coupling the other', () => {
    expect(resolveEntryLocales(['en-US'], 'zh-TW', null)).toEqual({
      siteLocale: 'zh-TW',
      gameLocale: 'eng',
    })
  })

  it('maps browser languages to supported site and game locales', () => {
    expect(resolveBrowserSiteLocale(['zh-Hant-TW', 'en'])).toBe('zh-TW')
    expect(resolveBrowserSiteLocale(['zh-CN', 'fr'])).toBe('ja')
    expect(resolveBrowserGameLocale(['zh-CN'])).toBe('chs')
    expect(resolveBrowserGameLocale(['id-ID'])).toBe('ind')
  })

  it('defaults both dimensions to Japanese when the browser has no match', () => {
    expect(resolveEntryLocales(['fr-FR'])).toEqual({
      siteLocale: 'ja',
      gameLocale: 'jpn',
    })
  })

  it('builds language-prefixed page paths', () => {
    expect(buildLocalizedPath('zh-TW', 'jpn', 'home')).toBe('/zh-TW/jpn')
    expect(buildLocalizedPath('en', 'chs', 'cards')).toBe('/en/chs/cards')
    expect(buildLocalizedPath('zh-TW', 'cht', 'characters')).toBe(
      '/zh-TW/cht/characters',
    )
    expect(buildLocalizedPath('ja', 'jpn', 'settings')).toBe('/ja/jpn/settings')
  })

  it('builds a locale route from a nested path', () => {
    expect(
      buildLocalizedRoute('en', 'cht', {
        path: '/jpn/cards/123',
        query: {},
        hash: '',
      }),
    ).toEqual({ path: '/en/cht/cards/123', query: {}, hash: '' })
  })

  it.each([
    '/ja/jpn/cards/123/history',
    '/ja/jpn/cards/123',
    '/ja/jpn/characters',
  ])('preserves router state for %s when changing locales', async (path) => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
      ],
    })
    const initialUrl = `${path}?q=a?b&tag=one&tag=two&revision=a%252Fb#changes%20here`
    await router.push(initialUrl)

    await router.replace(
      buildLocalizedRoute('en', 'cht', router.currentRoute.value),
    )

    expect(router.currentRoute.value.path).toBe(
      path.replace('/ja/jpn', '/en/cht'),
    )
    expect(router.currentRoute.value.query).toEqual({
      q: 'a?b',
      tag: ['one', 'two'],
      revision: 'a%2Fb',
    })
    expect(router.currentRoute.value.hash).toBe('#changes here')
    expect(router.currentRoute.value.fullPath).toBe(
      `${path.replace('/ja/jpn', '/en/cht')}?q=a?b&tag=one&tag=two&revision=a%252Fb#changes%20here`,
    )
  })

  it('prompts only when a manually chosen language conflicts with a link', () => {
    expect(getManualPreferenceConflict('en', 'jpn', 'zh-TW', null)).toEqual({
      siteLocale: 'zh-TW',
      gameLocale: 'jpn',
    })
    expect(getManualPreferenceConflict('en', 'jpn', null, null)).toBeNull()
    expect(getManualPreferenceConflict('en', 'jpn', 'en', 'jpn')).toBeNull()
  })

  it('covers all configured language variants', () => {
    const localizedHomes = siteLocales.flatMap((siteLocale) =>
      gameLocales.map((gameLocale) =>
        buildLocalizedPath(siteLocale, gameLocale, 'home'),
      ),
    )
    const localizedCards = siteLocales.flatMap((siteLocale) =>
      gameLocales.map((gameLocale) =>
        buildLocalizedPath(siteLocale, gameLocale, 'cards'),
      ),
    )
    const combinations = siteLocales.length * gameLocales.length
    expect(new Set(localizedHomes)).toHaveProperty('size', combinations)
    expect(new Set(localizedCards)).toHaveProperty('size', combinations)
  })
})
