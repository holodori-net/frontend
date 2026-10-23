import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { renderMemberThemeBootstrap } from '../scripts/member-theme-bootstrap'
import {
  defaultThemeId,
  memberThemeCookieName,
  type MemberTheme,
} from '../shared/theme'

const selectedThemeId = 'chr-00001'
const themes: MemberTheme[] = [defaultThemeId, selectedThemeId].map((id) => ({
  id,
  name: { jpn: id, eng: id, kor: id, cht: id, chs: id, ind: id },
  order: 0,
  color1: '#FFFFFF',
  color2: '#FFFFFF',
  color3: '#FFFFFF',
  color4: '#FFFFFF',
  assets: { avatar: null, motifMain: null, motifLight: null },
}))

function applyBootstrap(cookie: string | (() => string)) {
  const attributes = new Map([['data-theme-id', defaultThemeId]])
  const warning = vi.fn()
  const document = {
    get cookie() {
      return typeof cookie === 'function' ? cookie() : cookie
    },
    documentElement: {
      setAttribute: (name: string, value: string) =>
        attributes.set(name, value),
    },
  }

  runInNewContext(renderMemberThemeBootstrap(themes), {
    document,
    console: { warn: warning },
  })

  return { themeId: attributes.get('data-theme-id'), warning }
}

describe('member theme bootstrap', () => {
  it.each([
    `${memberThemeCookieName}=${selectedThemeId}`,
    `unrelated=value; ${memberThemeCookieName}=${selectedThemeId}; other=value`,
    `${memberThemeCookieName}=%63hr-00001`,
    `${memberThemeCookieName}=${encodeURIComponent(JSON.stringify(selectedThemeId))}`,
  ])('applies the saved theme without Nuxt or a payload: %s', (cookie) => {
    expect(applyBootstrap(cookie).themeId).toBe(selectedThemeId)
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
    expect(applyBootstrap(cookie).themeId).toBe(defaultThemeId)
  })

  it('warns and retains the default when cookie access fails', () => {
    const error = new Error('cookie access denied')
    const result = applyBootstrap(() => {
      throw error
    })

    expect(result.themeId).toBe(defaultThemeId)
    expect(result.warning).toHaveBeenCalledWith(expect.any(String), error)
  })
})
