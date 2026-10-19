import type { LocalizedNames } from './game-data/localized-text.ts'

export const defaultThemeId = 'chr-00015'
export const memberThemesDataKey = 'member-themes'

export interface MemberTheme {
  id: string
  name: LocalizedNames
  order: number
  color1: string
  color2: string
  color3: string
  color4: string
  assets: {
    avatar: string | null
    motifMain: string | null
    motifLight: string | null
  }
}

const memberAssetRoles = {
  avatar: 'img_chr_icon_normal',
  motifMain: 'img_chr_motif_icon_default_main',
  motifLight: 'img_chr_motif_icon_light_main',
} as const

export function getMemberThemeAssets(
  assetId: string | null,
): MemberTheme['assets'] {
  const url = (role: keyof typeof memberAssetRoles) => {
    if (!assetId) return null
    const name = `${memberAssetRoles[role]}_${assetId}`
    return `https://assets.holodori.net/cdn/${name}/Texture2D/${name}.webp`
  }
  return {
    avatar: url('avatar'),
    motifMain: url('motifMain'),
    motifLight: url('motifLight'),
  }
}

export function resolveMemberTheme(
  themes: readonly MemberTheme[],
  themeId: string | null | undefined,
): MemberTheme {
  const theme =
    themes.find(({ id }) => id === themeId) ??
    themes.find(({ id }) => id === defaultThemeId)
  if (!theme) throw new Error(`Missing default member theme: ${defaultThemeId}`)
  return theme
}
