import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import {
  createMemberThemePalette,
  primaryShades,
} from '../app/themes/member-palettes'
import primeVueTheme from '../app/themes/primevue'
import { renderMemberThemeCss } from '../scripts/styles/member-themes'
import { readMemberThemes } from '../server/data/member-themes'
import { defaultThemeId, type MemberTheme } from '../shared/theme'
import { gameLocales } from '../shared/language'

const themes = readMemberThemes()

function relativeLuminance(color: string): number {
  const channels = color
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    )
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}

function contrastRatio(color1: string, color2: string): number {
  const [lighter, darker] = [
    relativeLuminance(color1),
    relativeLuminance(color2),
  ].sort((a, b) => b - a)
  return (lighter! + 0.05) / (darker! + 0.05)
}

function surfaceShade(
  token: string,
): keyof ReturnType<typeof createMemberThemePalette>['light']['surface'] {
  return Number(token.slice('{surface.'.length, -1)) as keyof ReturnType<
    typeof createMemberThemePalette
  >['light']['surface']
}

function sampleTheme(id: string, color: string): MemberTheme {
  return {
    id,
    name: themes[0]!.name,
    order: 0,
    color1: color,
    color2: color,
    color3: color,
    color4: color,
    assets: { logo: null, avatar: null, motifMain: null, motifLight: null },
  }
}

describe('member theme styles', () => {
  it('sets readable Aura text tokens for both color schemes', () => {
    const colorScheme = primeVueTheme.preset.semantic.colorScheme as {
      light: { text: Record<string, string> }
      dark: { text: Record<string, string> }
    }
    const lightText = {
      color: '{surface.800}',
      hoverColor: '{surface.900}',
      mutedColor: '{surface.700}',
      hoverMutedColor: '{surface.800}',
    }
    const darkText = {
      color: '{surface.0}',
      hoverColor: '{surface.50}',
      mutedColor: '{surface.200}',
      hoverMutedColor: '{surface.100}',
    }

    expect(colorScheme.light.text).toEqual(lightText)
    expect(colorScheme.dark.text).toEqual(darkText)

    for (const theme of themes) {
      const palette = createMemberThemePalette(theme)
      for (const token of Object.values(lightText)) {
        const color = palette.light.surface[surfaceShade(token)]
        for (const background of [
          palette.light.page.background,
          palette.light.surface[0],
          palette.light.surface[50],
          palette.light.surface[100],
          palette.light.headerBackground,
          palette.light.backgroundAccent1,
          palette.light.backgroundAccent2,
        ]) {
          expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(4.5)
        }
      }
      for (const token of Object.values(darkText)) {
        const color = palette.dark.surface[surfaceShade(token)]
        for (const background of [
          palette.dark.page.background,
          palette.dark.surface[800],
          palette.dark.surface[900],
          palette.dark.surface[950],
          palette.dark.headerBackground,
          palette.dark.backgroundAccent1,
          palette.dark.backgroundAccent2,
        ]) {
          expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  it('includes every character with an official main color and six-language names', () => {
    const database = new DatabaseSync('.data/master.sqlite', { readOnly: true })
    try {
      const rows = database
        .prepare(
          `
        SELECT id FROM Character WHERE color1 IS NOT NULL AND color1 <> ''
        ORDER BY "order", id
      `,
        )
        .all()
      expect(themes.map(({ id }) => id)).toEqual(rows.map(({ id }) => id))
      for (const theme of themes) {
        expect(Object.keys(theme.name).sort()).toEqual([...gameLocales].sort())
      }
    } finally {
      database.close()
    }
  })

  it('generates readable page, primary, and button text for every member', () => {
    for (const theme of themes) {
      const palette = createMemberThemePalette(theme)
      for (const colors of [palette.light, palette.dark]) {
        for (const background of [
          colors.page.background,
          colors.headerBackground,
          colors.backgroundAccent1,
          colors.backgroundAccent2,
        ]) {
          expect(
            contrastRatio(colors.page.color, background),
          ).toBeGreaterThanOrEqual(4.5)
        }
        for (const background of [
          colors.primary.color,
          colors.primary.hoverColor,
          colors.primary.activeColor,
        ]) {
          expect(
            contrastRatio(colors.primary.contrastColor, background),
          ).toBeGreaterThanOrEqual(4.5)
        }
      }
      for (const surface of [
        palette.light.surface[0],
        palette.light.surface[50],
        palette.light.surface[100],
        palette.light.headerBackground,
        palette.light.backgroundAccent1,
        palette.light.backgroundAccent2,
      ]) {
        expect(
          contrastRatio(palette.light.primary.color, surface),
        ).toBeGreaterThanOrEqual(4.5)
      }
      for (const surface of [
        palette.dark.page.background,
        palette.dark.surface[800],
        palette.dark.surface[900],
        palette.dark.surface[950],
        palette.dark.headerBackground,
        palette.dark.backgroundAccent1,
        palette.dark.backgroundAccent2,
      ]) {
        expect(
          contrastRatio(palette.dark.primary.color, surface),
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it.each([
    ['yellow', '#E5CE00'],
    ['deep blue', '#2221AA'],
    ['gray', '#757575'],
  ])('uses %s as the official interactive color', (label, color) => {
    const theme = sampleTheme(`test-${label.replace(' ', '-')}`, color)
    const palette = createMemberThemePalette(theme)

    expect(palette.primary[500].toUpperCase()).toBe(color)
    expect(Object.values(palette.primary)).toContain(
      palette.light.primary.color,
    )
    expect(Object.values(palette.primary)).toContain(palette.dark.primary.color)
  })

  it('builds a fallback and scopes every generated theme by its stable ID', () => {
    const css = renderMemberThemeCss(themes)
    expect(css).toContain(`:root,:root[data-theme-id="${defaultThemeId}"]{`)
    expect(css).toContain(
      `:root.dark,:root.dark[data-theme-id="${defaultThemeId}"]{`,
    )
    for (const theme of themes) {
      expect(css).toContain(`:root[data-theme-id="${theme.id}"]{`)
    }
  })

  it('keeps the decorative background and generated palette when a motif is absent', () => {
    const theme = sampleTheme(defaultThemeId, '#C9345D')
    const css = renderMemberThemeCss([theme])
    expect(css).toContain('--member-background-accent-1:')
    expect(css).toContain('--member-background-accent-2:')
  })

  it('keeps Aura semantic text shades readable on their matching surfaces', () => {
    for (const theme of themes) {
      const palette = createMemberThemePalette(theme)
      expect(
        contrastRatio(palette.light.surface[700], palette.light.surface[0]),
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        contrastRatio(palette.dark.surface[0], palette.dark.surface[900]),
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('fails when the configured fallback theme is missing', () => {
    expect(() => renderMemberThemeCss(themes, 'missing-theme')).toThrow(
      'Missing default member theme: missing-theme',
    )
  })

  it('retains the PrimeVue shade scale contract', () => {
    expect(primaryShades).toEqual([
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
    ])
  })
})
