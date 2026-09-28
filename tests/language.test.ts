import { describe, expect, it } from 'vitest'
import {
  buildLocalizedPath,
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
    expect(buildLocalizedPath('ja', 'jpn', 'settings')).toBe('/ja/jpn/settings')
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
    expect(siteLocales).toHaveLength(3)
    expect(gameLocales).toHaveLength(6)
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
    expect(new Set(localizedHomes)).toHaveProperty('size', 18)
    expect(new Set(localizedCards)).toHaveProperty('size', 18)
  })
})
