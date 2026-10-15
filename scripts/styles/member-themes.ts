import {
  createMemberThemePalette,
  primaryShades,
  surfaceShades,
  type MemberThemeColors,
} from '../../app/themes/member-palettes.ts'
import { defaultThemeId, type MemberTheme } from '../../shared/theme.ts'

function modeVariables(colors: MemberThemeColors): string {
  return [
    ...surfaceShades.map(
      (shade) => `--member-surface-${shade}:${colors.surface[shade]};`,
    ),
    `--member-primary-color:${colors.primary.color};`,
    `--member-primary-contrast-color:${colors.primary.contrastColor};`,
    `--member-primary-hover-color:${colors.primary.hoverColor};`,
    `--member-primary-active-color:${colors.primary.activeColor};`,
    `--member-page-background:${colors.page.background};`,
    `--member-page-color:${colors.page.color};`,
    `--member-header-background:${colors.headerBackground};`,
    `--member-motif-color:${colors.motifColor};`,
    `--member-background-accent-1:${colors.backgroundAccent1};`,
    `--member-background-accent-2:${colors.backgroundAccent2};`,
  ].join('')
}

function themeCss(theme: MemberTheme, fallback: boolean): string {
  const palette = createMemberThemePalette(theme)
  const selector = `:root[data-theme-id="${theme.id}"]`
  const darkSelector = `:root.dark[data-theme-id="${theme.id}"]`
  const lightSelector = fallback ? `:root,${selector}` : selector
  const darkModeSelector = fallback
    ? `:root.dark,${darkSelector}`
    : darkSelector
  const common = primaryShades
    .map((shade) => `--member-primary-${shade}:${palette.primary[shade]};`)
    .join('')

  return `${lightSelector}{${common}${modeVariables(palette.light)}}\n${darkModeSelector}{${modeVariables(palette.dark)}}`
}

export function renderMemberThemeCss(
  themes: readonly MemberTheme[],
  fallbackId = defaultThemeId,
): string {
  const fallbackTheme = themes.find((theme) => theme.id === fallbackId)
  if (!fallbackTheme) {
    throw new Error(`Missing default member theme: ${fallbackId}`)
  }

  for (const theme of themes) {
    if (!/^[a-z0-9-]+$/.test(theme.id)) {
      throw new Error(`Invalid member theme ID: ${theme.id}`)
    }
  }

  return themes
    .map((theme) => themeCss(theme, theme.id === fallbackId))
    .join('\n')
}
