import {
  defaultThemeId,
  memberThemeCookieName,
  resolveMemberTheme,
} from '#shared/theme'
import type { Ref } from 'vue'

export default defineNuxtPlugin(() => {
  const { themes, theme, setTheme, initialized } = useMemberTheme()
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
