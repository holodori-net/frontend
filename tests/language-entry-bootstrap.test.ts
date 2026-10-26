import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { buildLanguageEntryBootstrap } from '../scripts/build-language-entry-bootstrap'
import { runLanguageEntryBootstrap } from '../scripts/language-entry-bootstrap'

function createEnvironment(
  pathname: string,
  options: {
    cookie?: string | (() => string)
    languages?: readonly string[]
    search?: string
    hash?: string
    replace?: (url: string) => void
  } = {},
) {
  const attributes = new Map<string, string>()
  const replace = options.replace ?? vi.fn()
  const warn = vi.fn()
  const windowObject = {
    location: {
      pathname,
      search: options.search ?? '',
      hash: options.hash ?? '',
      replace,
    },
    navigator: { languages: options.languages ?? [] },
  }
  const documentObject = {
    get cookie() {
      return typeof options.cookie === 'function'
        ? options.cookie()
        : (options.cookie ?? '')
    },
    documentElement: {
      setAttribute: (name: string, value: string) =>
        attributes.set(name, value),
    },
  }

  const redirected = runLanguageEntryBootstrap(
    windowObject,
    documentObject,
    warn,
  )

  return { attributes, redirected, replace, warn }
}

describe('language entry bootstrap', () => {
  it('redirects before Nuxt is available using browser languages', () => {
    const result = createEnvironment('/', { languages: ['en-US'] })

    expect(result.replace).toHaveBeenCalledWith('/en/eng')
    expect(result.redirected).toBe(true)
    expect(result.attributes.get('data-language-entry-fallback')).toBe('hidden')
  })

  it('prefers valid saved cookies, including encoded JSON string values', () => {
    const result = createEnvironment('/', {
      cookie: 'holodori-site-locale=%22en%22; holodori-game-locale=%22cht%22',
      languages: ['ja-JP'],
    })

    expect(result.replace).toHaveBeenCalledWith('/en/cht')
  })

  it('falls back per cookie when one saved locale is invalid', () => {
    const result = createEnvironment('/', {
      cookie: 'holodori-site-locale=invalid; holodori-game-locale=cht',
      languages: ['en-US'],
    })

    expect(result.replace).toHaveBeenCalledWith('/en/cht')
  })

  it('falls back to browser languages when cookie access throws', () => {
    const error = new Error('cookie access denied')
    const result = createEnvironment('/songs', {
      cookie: () => {
        throw error
      },
      languages: ['zh-TW'],
    })

    expect(result.replace).toHaveBeenCalledWith('/zh-TW/cht/songs')
    expect(result.warn).toHaveBeenCalledWith(
      'Unable to read saved language preferences',
      error,
    )
  })

  it('preserves query and hash while localizing a nested route', () => {
    const result = createEnvironment('/cards/card-12', {
      search: '?source=home&filter=a%2Fb&filter=second%20value',
      hash: '#skills',
      languages: ['ko-KR'],
    })

    expect(result.replace).toHaveBeenCalledWith(
      '/ja/kor/cards/card-12?source=home&filter=a%2Fb&filter=second%20value#skills',
    )
  })

  it('keeps a complete localized URL on its current language', () => {
    const result = createEnvironment('/en/eng/cards/card-12', {
      cookie: 'holodori-site-locale=ja; holodori-game-locale=jpn',
      search: '?q=hello',
      hash: '#detail',
    })

    expect(result.redirected).toBe(false)
    expect(result.replace).not.toHaveBeenCalled()
  })

  it('uses the Japanese fallback and leaves the continue link visible if redirect fails', () => {
    const error = new Error('navigation unavailable')
    const replace = vi.fn(() => {
      throw error
    })
    const result = createEnvironment('/characters', {
      replace,
    })

    expect(result.replace).toHaveBeenCalledWith('/ja/jpn/characters')
    expect(result.redirected).toBe(false)
    expect(result.attributes.get('data-language-entry-fallback')).toBe('failed')
    expect(result.warn).toHaveBeenCalledWith(
      'Unable to redirect to the selected language',
      error,
    )
  })

  it('runs the actual Vite bundle without Nuxt globals', async () => {
    const script = await buildLanguageEntryBootstrap()
    const replace = vi.fn()
    const attributes = new Map<string, string>()
    const windowObject = {
      location: {
        pathname: '/songs',
        search: '?q=cover%2Fsong',
        hash: '#results',
        replace,
      },
      navigator: { languages: ['en-GB'] },
    }
    const documentObject = {
      cookie: '',
      documentElement: {
        setAttribute: (name: string, value: string) =>
          attributes.set(name, value),
      },
    }

    runInNewContext(script, {
      window: windowObject,
      document: documentObject,
      console: { warn: vi.fn() },
    })

    expect(replace).toHaveBeenCalledWith('/en/eng/songs?q=cover%2Fsong#results')
    expect(attributes.get('data-language-entry-fallback')).toBe('hidden')
  })
})
