import { describe, expect, it } from 'vitest'
import {
  getLanguageEntryRoutes,
  getStaticLanguageEntryPaths,
} from '../scripts/page-entries'

describe('language entry routes', () => {
  it('derives entries from localized pages and excludes routes disabled for i18n', () => {
    const componentFile = '/project/app/components/LanguageEntry.vue'
    const pages = [
      {
        path: '/:gameLocale()',
        file: '/project/app/pages/[gameLocale]/index.vue',
        meta: { validate: () => true },
        children: [
          {
            path: 'cards',
            file: '/project/app/pages/[gameLocale]/cards/index.vue',
            meta: { validate: () => true },
            children: [
              {
                path: ':id()',
                file: '/project/app/pages/[gameLocale]/cards/[id].vue',
                meta: { validate: () => true },
              },
            ],
          },
          {
            path: 'characters',
            file: '/project/app/pages/[gameLocale]/characters.vue',
            meta: { validate: () => true },
          },
          {
            path: 'settings',
            file: '/project/app/pages/[gameLocale]/settings.vue',
            meta: { validate: () => true },
          },
          { path: 'details', meta: { i18n: false } },
        ],
      },
    ]

    const routes = getLanguageEntryRoutes(pages, componentFile)

    expect(routes.map(({ path }) => path)).toEqual([
      '/',
      '/cards',
      '/cards/:id()',
      '/characters',
      '/settings',
    ])
    expect(routes.map(({ name }) => name)).toEqual([
      'language-entry-home',
      'language-entry-cards',
      'language-entry-cards-id',
      'language-entry-characters',
      'language-entry-settings',
    ])
    expect(routes.every(({ file }) => file === componentFile)).toBe(true)
    expect(routes.every(({ meta }) => meta?.i18n === false)).toBe(true)
    expect(routes.every(({ meta }) => meta?.validate === undefined)).toBe(true)
    expect(
      getStaticLanguageEntryPaths([
        ...routes.map(({ path }) => path),
        '/cards-:id()',
      ]),
    ).toEqual(['/', '/cards', '/characters', '/settings'])
  })

  it('keeps generated names unique when paths normalize to the same name', () => {
    const routes = getLanguageEntryRoutes(
      [
        { path: '/:gameLocale()/foo/bar', name: 'language-entry-foo-bar' },
        { path: '/:gameLocale()/foo-bar' },
      ],
      '/project/app/components/LanguageEntry.vue',
    )

    expect(routes.map(({ name }) => name)).toEqual([
      'language-entry-foo-bar-2',
      'language-entry-foo-bar-3',
    ])
  })
})
