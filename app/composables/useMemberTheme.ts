import {
  defaultThemeId,
  resolveMemberTheme,
  type MemberTheme,
} from '#shared/theme'
import { memberThemes } from '#build/member-data'

export function useMemberTheme() {
  const themes = computed<readonly MemberTheme[]>(() => memberThemes)
  const themeId = useState<string>(
    'selected-member-theme-id',
    () => defaultThemeId,
  )
  const initialized = useState<boolean>('member-theme-initialized', () => false)
  const theme = computed(() => resolveMemberTheme(themes.value, themeId.value))
  const selectedThemeId = computed({
    get: () => themeId.value,
    set: setTheme,
  })

  function setTheme(id: string) {
    themeId.value = resolveMemberTheme(themes.value, id).id
  }

  return { themes, theme, selectedThemeId, setTheme, initialized }
}
