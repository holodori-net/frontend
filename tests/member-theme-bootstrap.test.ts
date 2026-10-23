import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { renderMemberThemeBootstrap } from '../scripts/member-theme-bootstrap'
import {
  defaultThemeId,
  memberThemeCookieName,
  memberThemeFaviconKey,
  memberThemeFaviconPlaceholderUrl,
  memberThemeFallbackLogoUrl,
  type MemberTheme,
} from '../shared/theme'

const selectedThemeId = 'chr-00001'
const selectedLogo =
  'https://assets.holodori.net/cdn/img_card_thumb_00001-4-cmmn-0000-00/Texture2D/img_card_thumb_00001-4-cmmn-0000-00.webp'
const themes: MemberTheme[] = [defaultThemeId, selectedThemeId].map((id) => ({
  id,
  name: { jpn: id, eng: id, kor: id, cht: id, chs: id, ind: id },
  order: 0,
  color1: '#FFFFFF',
  color2: '#FFFFFF',
  color3: '#FFFFFF',
  color4: '#FFFFFF',
  assets: {
    logo: id === selectedThemeId ? selectedLogo : null,
    avatar: null,
    motifMain: null,
    motifLight: null,
  },
}))

function applyBootstrap(
  cookie: string | (() => string),
  options: { themes?: readonly MemberTheme[]; withFavicon?: boolean } = {},
) {
  const attributes = new Map([['data-theme-id', defaultThemeId]])
  const faviconAttributes = new Map([
    ['href', memberThemeFaviconPlaceholderUrl],
    ['type', 'image/svg+xml'],
  ])
  const favicon = {
    setAttribute: (name: string, value: string) =>
      faviconAttributes.set(name, value),
  }
  const warning = vi.fn()
  const document = {
    get cookie() {
      return typeof cookie === 'function' ? cookie() : cookie
    },
    documentElement: {
      setAttribute: (name: string, value: string) =>
        attributes.set(name, value),
    },
    querySelector: (selector: string) =>
      options.withFavicon === false ||
      selector !== `link[data-hid="${memberThemeFaviconKey}"]`
        ? null
        : favicon,
  }

  runInNewContext(renderMemberThemeBootstrap(options.themes ?? themes), {
    document,
    console: { warn: warning },
  })

  return {
    themeId: attributes.get('data-theme-id'),
    favicon: Object.fromEntries(faviconAttributes),
    warning,
  }
}

describe('member theme bootstrap', () => {
  it.each([
    `${memberThemeCookieName}=${selectedThemeId}`,
    `unrelated=value; ${memberThemeCookieName}=${selectedThemeId}; other=value`,
    `${memberThemeCookieName}=%63hr-00001`,
    `${memberThemeCookieName}=${encodeURIComponent(JSON.stringify(selectedThemeId))}`,
  ])('applies the saved theme without Nuxt or a payload: %s', (cookie) => {
    const result = applyBootstrap(cookie)
    expect(result.themeId).toBe(selectedThemeId)
    expect(result.favicon).toEqual({ href: selectedLogo, type: 'image/webp' })
  })

  it.each([
    '',
    'unrelated=value',
    `other-${memberThemeCookieName}=${selectedThemeId}`,
    `${memberThemeCookieName}suffix=${selectedThemeId}`,
    `${memberThemeCookieName}=`,
    `${memberThemeCookieName}=chr-99999`,
    `${memberThemeCookieName}=null`,
    `${memberThemeCookieName}=${encodeURIComponent(JSON.stringify([selectedThemeId]))}`,
    `${memberThemeCookieName}=%E0%A4%A`,
  ])('uses the default for absent or invalid preferences: %s', (cookie) => {
    const result = applyBootstrap(cookie)
    expect(result.themeId).toBe(defaultThemeId)
    expect(result.favicon).toEqual({
      href: memberThemeFallbackLogoUrl,
      type: 'image/png',
    })
  })

  it('warns and retains the default when cookie access fails', () => {
    const error = new Error('cookie access denied')
    const result = applyBootstrap(() => {
      throw error
    })

    expect(result.themeId).toBe(defaultThemeId)
    expect(result.favicon).toEqual({
      href: memberThemeFallbackLogoUrl,
      type: 'image/png',
    })
    expect(result.warning).toHaveBeenCalledWith(expect.any(String), error)
  })

  it('uses the local icon when the selected theme has no logo', () => {
    expect(applyBootstrap('').favicon).toEqual({
      href: memberThemeFallbackLogoUrl,
      type: 'image/png',
    })
  })

  it('continues when the keyed favicon link is absent', () => {
    const result = applyBootstrap(
      `${memberThemeCookieName}=${selectedThemeId}`,
      {
        withFavicon: false,
      },
    )

    expect(result.themeId).toBe(selectedThemeId)
    expect(result.warning).not.toHaveBeenCalled()
  })

  it('safely applies URLs containing script delimiters', () => {
    const escapedLogo =
      'https://assets.holodori.net/</script><script>alert(1)</script>.webp'
    const escapingTheme = {
      ...themes[1]!,
      assets: { ...themes[1]!.assets, logo: escapedLogo },
    }
    expect(
      renderMemberThemeBootstrap([themes[0]!, escapingTheme]),
    ).not.toContain('</script>')
    const result = applyBootstrap(
      `${memberThemeCookieName}=${selectedThemeId}`,
      {
        themes: [themes[0]!, escapingTheme],
      },
    )

    expect(result.favicon).toEqual({ href: escapedLogo, type: 'image/webp' })
  })
})
