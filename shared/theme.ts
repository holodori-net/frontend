export const defaultThemeId = '15-sakura-miko'

export interface MemberTheme {
  id: string
  memberId: number
  name: string
  assets: {
    avatar?: string
    motifMain: string
  }
}

export const memberThemes: Record<string, MemberTheme> = {
  [defaultThemeId]: {
    id: defaultThemeId,
    memberId: 15,
    name: 'さくらみこ',
    assets: {
      avatar: '/icons/icon-192.png',
      motifMain: '/themes/15-sakura-miko-motif-main.png',
    },
  },
}

export function resolveMemberTheme(themeId: string | null | undefined) {
  return memberThemes[themeId ?? ''] ?? memberThemes[defaultThemeId]!
}
