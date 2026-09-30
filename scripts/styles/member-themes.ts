import {
  memberThemePalettes,
  primaryShades,
  surfaceShades,
  type MemberThemeColors,
  type MemberThemePalette,
} from '../../app/themes/member-palettes.ts'
import {
  defaultThemeId,
  memberThemes,
  type MemberTheme,
} from '../../shared/theme.ts'

function modeVariables(colors: MemberThemeColors) {
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
    `--member-motif-color:${colors.motifColor};`,
  ].join('')
}

export function renderMemberThemeCss(
  themes: Record<string, MemberTheme> = memberThemes,
  palettes: Record<string, MemberThemePalette> = memberThemePalettes,
  fallbackId = defaultThemeId,
): string {
  if (!themes[fallbackId] || !palettes[fallbackId]) {
    throw new Error(`Missing default member theme: ${fallbackId}`)
  }

  return Object.values(themes)
    .map((theme) => {
      const palette = palettes[theme.id]
      if (!palette)
        throw new Error(`Missing palette for member theme: ${theme.id}`)
      if (!/^[a-z0-9-]+$/.test(theme.id)) {
        throw new Error(`Invalid member theme ID: ${theme.id}`)
      }
      const { size, gap } = palette.motif
      if (
        !Number.isFinite(size) ||
        size <= 0 ||
        !Number.isFinite(gap) ||
        gap < 0
      ) {
        throw new Error(
          `Invalid motif dimensions for member theme: ${theme.id}`,
        )
      }
      const selector = `:root[data-theme-id="${theme.id}"]`
      const darkSelector = `:root.dark[data-theme-id="${theme.id}"]`
      const light = theme.id === fallbackId ? `:root,${selector}` : selector
      const dark =
        theme.id === fallbackId ? `:root.dark,${darkSelector}` : darkSelector
      const motif = theme.assets.motifMain
        ? `url(${JSON.stringify(theme.assets.motifMain)})`
        : 'none'
      const common = [
        ...primaryShades.map(
          (shade) => `--member-primary-${shade}:${palette.primary[shade]};`,
        ),
        `--theme-motif:${motif};`,
        `--theme-motif-size:${size}px;`,
        `--theme-motif-step:${size + gap}px;`,
      ].join('')
      return `${light}{${common}${modeVariables(palette.light)}}\n${dark}{${modeVariables(palette.dark)}}`
    })
    .join('\n')
}
