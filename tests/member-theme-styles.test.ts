import { describe, expect, it } from 'vitest'
import { memberThemePalettes } from '../app/themes/member-palettes'
import { renderMemberThemeCss } from '../scripts/styles/member-themes'
import { defaultThemeId, memberThemes } from '../shared/theme'

describe('member theme styles', () => {
  it('provides the default palette for both appearance modes', () => {
    const css = renderMemberThemeCss()
    expect(css).toContain(`:root,:root[data-theme-id="${defaultThemeId}"]{`)
    expect(css).toContain(
      `:root.dark,:root.dark[data-theme-id="${defaultThemeId}"]{`,
    )
    expect(css).toContain('--member-page-background:#FFF7FA;')
    expect(css).toContain('--member-page-background:#1F1722;')
    expect(css).toContain('--theme-motif-size:20px;--theme-motif-step:40px;')
  })

  it('keeps added theme assets and palettes scoped to their stable ID', () => {
    const id = 'test-member'
    const palette = structuredClone(memberThemePalettes[defaultThemeId]!)
    palette.light.primary.color = '#123456'
    palette.dark.primary.color = '#abcdef'
    palette.motif = { size: 16, gap: 30 }
    const css = renderMemberThemeCss(
      {
        ...memberThemes,
        [id]: {
          id,
          memberId: 99,
          name: 'Test member',
          assets: { motifMain: '/themes/imported-motif.png' },
        },
      },
      { ...memberThemePalettes, [id]: palette },
    )
    const rules = css.split('\n')
    const light = rules.find((rule) =>
      rule.startsWith(`:root[data-theme-id="${id}"]{`),
    )
    const dark = rules.find((rule) =>
      rule.startsWith(`:root.dark[data-theme-id="${id}"]{`),
    )
    expect(light).toContain('--member-primary-color:#123456;')
    expect(light).toContain('--theme-motif:url("/themes/imported-motif.png");')
    expect(light).toContain('--theme-motif-size:16px;--theme-motif-step:46px;')
    expect(dark).toContain('--member-primary-color:#abcdef;')
  })

  it('fails before publishing CSS when a registered theme lacks a palette', () => {
    expect(() => renderMemberThemeCss(memberThemes, {})).toThrow(
      'Missing default member theme',
    )
    expect(() =>
      renderMemberThemeCss({
        ...memberThemes,
        another: { ...memberThemes[defaultThemeId]!, id: 'another' },
      }),
    ).toThrow('Missing palette for member theme: another')
  })
})
