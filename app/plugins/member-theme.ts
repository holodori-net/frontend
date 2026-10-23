import {
  defaultThemeId,
  memberThemeCookieName,
  memberThemesDataKey,
  resolveMemberTheme,
  type MemberTheme,
} from '#shared/theme'
import type { Ref } from 'vue'

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

  const { theme, setTheme, initialized } = useMemberTheme()
  let initialPreferredThemeId = defaultThemeId
  let preferredThemeId: Ref<string | null> | undefined

  if (import.meta.client) {
    try {
      preferredThemeId = useCookie<string | null>(memberThemeCookieName, {
        default: () => defaultThemeId,
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        decode: (value) => {
          if (typeof value !== 'string') return defaultThemeId
          try {
            const decoded = decodeURIComponent(value)
            const parsed = decoded.startsWith('"')
              ? JSON.parse(decoded)
              : decoded
            return typeof parsed === 'string' ? parsed : defaultThemeId
          } catch (error) {
            console.warn('Unable to read saved member theme preference', error)
            return defaultThemeId
          }
        },
      })
      initialPreferredThemeId = resolveMemberTheme(
        themes.value,
        preferredThemeId.value,
      ).id
    } catch (error) {
      console.warn('Unable to read saved member theme preference', error)
    }
  }

  useHead({
    htmlAttrs: {
      'data-theme-id': computed(() =>
        initialized.value ? theme.value.id : initialPreferredThemeId,
      ),
    },
  })

  if (import.meta.client) {
    const nuxtApp = useNuxtApp()

    nuxtApp.hook('app:mounted', () => {
      setTheme(initialPreferredThemeId)
      initialized.value = true
      if (preferredThemeId) {
        const cookie = preferredThemeId
        watch(theme, (value) => {
          cookie.value = value.id
        })
      }
    })
  }
})
