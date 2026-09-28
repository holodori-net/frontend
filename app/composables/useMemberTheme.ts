import { defaultThemeId, memberThemes, resolveMemberTheme } from '#shared/theme'

export function useMemberTheme() {
  const selectedThemeId = useCookie<string>('holodori-theme-id', {
    default: () => defaultThemeId,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const theme = computed(() => resolveMemberTheme(selectedThemeId.value))
  watch(
    selectedThemeId,
    (value) => {
      if (!memberThemes[value]) selectedThemeId.value = defaultThemeId
    },
    { immediate: true },
  )

  return { selectedThemeId, theme }
}
