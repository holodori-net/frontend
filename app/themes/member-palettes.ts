import { mix, palette, shade, tint } from '@primeuix/themes'
import type { MemberTheme } from '#shared/theme.ts'

export const primaryShades = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const
export const surfaceShades = [0, ...primaryShades] as const

export interface MemberThemeColors {
  primary: {
    color: string
    contrastColor: string
    hoverColor: string
    activeColor: string
  }
  surface: Record<(typeof surfaceShades)[number], string>
  page: { background: string; color: string }
  headerBackground: string
  motifColor: string
  backgroundAccent1: string
  backgroundAccent2: string
}

export interface MemberThemePalette {
  primary: Record<(typeof primaryShades)[number], string>
  light: MemberThemeColors
  dark: MemberThemeColors
}

const white = '#FFFFFF'
const black = '#000000'
const neutral = '#808080'

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
  const luminances = [
    relativeLuminance(color1),
    relativeLuminance(color2),
  ].sort((a, b) => b - a)
  return (luminances[0]! + 0.05) / (luminances[1]! + 0.05)
}

function bestContrastColor(color: string): string {
  return contrastRatio(color, white) >= contrastRatio(color, black)
    ? white
    : black
}

function meetsContrast(color: string, backgrounds: readonly string[]): boolean {
  const text = bestContrastColor(color)
  return (
    contrastRatio(color, text) >= 4.5 &&
    backgrounds.every((background) => contrastRatio(color, background) >= 4.5)
  )
}

function choosePrimary(
  scale: MemberThemePalette['primary'],
  backgrounds: readonly string[],
  dark: boolean,
): { color: string; contrastColor: string; level: number } {
  const preference = dark
    ? [500, 400, 300, 200, 100, 50, 600, 700, 800, 900, 950]
    : [500, 600, 700, 800, 900, 950, 400, 300, 200, 100, 50]
  const level = preference.find((shade) =>
    meetsContrast(scale[shade as keyof typeof scale], backgrounds),
  )

  if (level === undefined) {
    throw new Error('Unable to find an accessible member primary shade')
  }

  const color = scale[level as keyof typeof scale]
  return { color, contrastColor: bestContrastColor(color), level }
}

function interactionColors(
  scale: MemberThemePalette['primary'],
  backgrounds: readonly string[],
  dark: boolean,
) {
  const selected = choosePrimary(scale, backgrounds, dark)
  const levels = primaryShades
    .filter((level) => (dark ? level < selected.level : level > selected.level))
    .sort((a, b) => (dark ? b - a : a - b))
  const stateColor = (step: number): string => {
    const level = levels[step - 1]
    if (level !== undefined) return scale[level]
    return dark
      ? tint(selected.color, 20 + step * 12)
      : shade(selected.color, 20 + step * 12)
  }
  const hoverColor = stateColor(1)
  const activeColor = stateColor(2)
  const { color, contrastColor } = selected

  for (const [state, stateColor] of [
    ['default', color],
    ['hover', hoverColor],
    ['active', activeColor],
  ] as const) {
    if (contrastRatio(contrastColor, stateColor) < 4.5) {
      throw new Error(
        `Insufficient ${state} button contrast for color ${color}`,
      )
    }
  }

  return { color, contrastColor, hoverColor, activeColor }
}

function modeColors(
  theme: MemberTheme,
  surface: MemberThemePalette['light']['surface'],
  buttonScale: MemberThemePalette['primary'],
  background: string,
  dark: boolean,
): MemberThemeColors {
  const pageColor = surface[dark ? 0 : 950]
  const headerBackground = dark
    ? mix(theme.color1, '#18181B', 20)
    : mix(theme.color1, white, 18)
  const accentWeight = dark ? 14 : 16
  const backgroundAccent1 = mix(theme.color2, background, accentWeight)
  const backgroundAccent2 = mix(theme.color3, background, accentWeight)
  const primaryBackgrounds = dark
    ? [
        background,
        surface[800],
        surface[900],
        surface[950],
        headerBackground,
        backgroundAccent1,
        backgroundAccent2,
      ]
    : [
        background,
        surface[0],
        surface[50],
        surface[100],
        headerBackground,
        backgroundAccent1,
        backgroundAccent2,
      ]

  return {
    primary: interactionColors(buttonScale, primaryBackgrounds, dark),
    surface,
    page: { background, color: pageColor },
    headerBackground,
    motifColor:
      theme.assets.motifMain || theme.assets.motifLight
        ? `color-mix(in srgb, ${theme.color2} 4%, transparent)`
        : 'transparent',
    backgroundAccent1,
    backgroundAccent2,
  }
}

export function createMemberThemePalette(
  theme: MemberTheme,
): MemberThemePalette {
  const surfaceSource = mix(theme.color1, neutral, 12)
  const surfaceScale = palette(surfaceSource) as MemberThemePalette['primary']
  const surface = {
    0: white,
    ...surfaceScale,
  } as MemberThemePalette['light']['surface']
  const primary = palette(theme.color4) as MemberThemePalette['primary']

  return {
    primary,
    light: modeColors(
      theme,
      surface,
      primary,
      mix(theme.color1, white, 10),
      false,
    ),
    dark: modeColors(
      theme,
      surface,
      primary,
      mix(theme.color1, '#101014', 12),
      true,
    ),
  }
}
