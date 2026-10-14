import {
  defaultThemeId,
  memberThemesDataKey,
  resolveMemberTheme,
  type MemberTheme,
} from '#shared/theme'

export default defineNuxtPlugin(async () => {
  const { data: themes, error } = await useAsyncData<MemberTheme[]>(
    memberThemesDataKey,
    async () => {
      if (import.meta.server) {
        const { readMemberThemes } =
          await import('~~/server/data/member-themes')
        return readMemberThemes()
      }

      const payloadThemes = useNuxtApp().payload.data[memberThemesDataKey] as
        MemberTheme[] | undefined
      if (payloadThemes) return payloadThemes

      throw createError({
        statusCode: 500,
        statusMessage: 'Member theme data is unavailable',
        fatal: true,
      })
    },
  )

  if (error.value) throw error.value
  if (themes.value === null || themes.value === undefined) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Member theme data is unavailable',
      fatal: true,
    })
  }

  const { theme, setTheme } = useMemberTheme()
  useHead({
    htmlAttrs: {
      'data-theme-id': computed(() => theme.value.id),
    },
  })

  if (import.meta.client) {
    const preferredThemeId = useCookie<string | null>('holodori-theme-id', {
      default: () => defaultThemeId,
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
    const nuxtApp = useNuxtApp()

    nuxtApp.hook('app:mounted', () => {
      setTheme(resolveMemberTheme(themes.value!, preferredThemeId.value).id)
      watch(theme, (value) => {
        preferredThemeId.value = value.id
      })
    })
  }
})
