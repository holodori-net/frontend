import type { LocalizedNames } from './game-data/localized-text.ts'

export const defaultThemeId = 'chr-00015'
export const memberThemeCookieName = 'holodori-theme-id'
export const memberThemeFaviconKey = 'site-favicon'
export const memberThemeFaviconPlaceholderUrl = '/icons/favicon-placeholder.svg'
export const memberThemeFallbackLogoUrl = '/icons/icon-192.png'
export const memberThemesDataKey = 'member-themes'

export function getMemberThemeLogoType(source: string): string {
  return source.endsWith('.webp') ? 'image/webp' : 'image/png'
}

export interface MemberTheme {
  id: string
  name: LocalizedNames
  order: number
  color1: string
  color2: string
  color3: string
  color4: string
  assets: {
    logo: string | null
    avatar: string | null
    motifMain: string | null
    motifLight: string | null
  }
}

const memberAssetRoles = {
  logo: 'img_card_thumb',
  avatar: 'img_chr_icon_normal',
  motifMain: 'img_chr_motif_icon_default_main',
  motifLight: 'img_chr_motif_icon_light_main',
} as const

export function getMemberThemeAssets(
  assetId: string | null,
): MemberTheme['assets'] {
  const url = (role: keyof typeof memberAssetRoles) => {
    if (!assetId) return null
    const name =
      role === 'logo'
        ? `${memberAssetRoles[role]}_${assetId}-4-cmmn-0000-00`
        : `${memberAssetRoles[role]}_${assetId}`
    return `https://assets.holodori.net/cdn/${name}/Texture2D/${name}.webp`
  }
  return {
    logo: url('logo'),
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
