import {
  buildLocalizedRoute,
  isGameLocale,
  isSiteLocale,
  resolveEntryLocales,
} from '../shared/language'

const siteLocaleCookieName = 'holodori-site-locale'
const gameLocaleCookieName = 'holodori-game-locale'
const fallbackAttribute = 'data-language-entry-fallback'

interface LanguageEntryWindow {
  location: {
    pathname: string
    search: string
    hash: string
    replace: (url: string) => void
  }
  navigator: { languages?: readonly string[] }
}

interface LanguageEntryDocument {
  cookie: string
  documentElement: {
    setAttribute: (name: string, value: string) => void
  }
}

function readCookie(cookieHeader: string, name: string) {
  const value = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)

  if (!value) return null

  try {
    const decoded = decodeURIComponent(value)
    const parsed = decoded.startsWith('"') ? JSON.parse(decoded) : decoded
    return typeof parsed === 'string' ? parsed : null
  } catch {
    return null
  }
}

export function runLanguageEntryBootstrap(
  windowObject: LanguageEntryWindow,
  documentObject: LanguageEntryDocument,
  warn: (...values: unknown[]) => void = console.warn,
) {
  const segments = windowObject.location.pathname.split('/').filter(Boolean)
  const urlSiteLocale = segments[0]
  const urlGameLocale = segments[1]

  if (
    urlSiteLocale &&
    isSiteLocale(urlSiteLocale) &&
    urlGameLocale &&
    isGameLocale(urlGameLocale)
  ) {
    return false
  }

  let sitePreference: string | null = null
  let gamePreference: string | null = null

  try {
    sitePreference = readCookie(documentObject.cookie, siteLocaleCookieName)
    gamePreference = readCookie(documentObject.cookie, gameLocaleCookieName)
  } catch (error) {
    warn('Unable to read saved language preferences', error)
  }

  try {
    const resolved = resolveEntryLocales(
      windowObject.navigator.languages ?? [],
      sitePreference,
      gamePreference,
    )
    const route = buildLocalizedRoute(
      resolved.siteLocale,
      resolved.gameLocale,
      {
        path: windowObject.location.pathname,
        query: {},
        hash: '',
      },
    )
    const target = `${route.path}${windowObject.location.search}${windowObject.location.hash}`

    windowObject.location.replace(target)
    documentObject.documentElement.setAttribute(fallbackAttribute, 'hidden')
    return true
  } catch (error) {
    warn('Unable to redirect to the selected language', error)
    documentObject.documentElement.setAttribute(fallbackAttribute, 'failed')
    return false
  }
}

if (globalThis.window && globalThis.document) {
  runLanguageEntryBootstrap(globalThis.window, globalThis.document)
}
