import {
  gameLocales,
  siteLocales,
  siteLanguageMetadata,
  sitePages,
} from './shared/language'
import { primeVueComponents } from './shared/primevue'
import { defaultThemeId, resolveMemberTheme } from './shared/theme'
import { createMemberThemePalette } from './app/themes/member-palettes'
import { readMemberThemes } from './server/data/member-themes'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { generateSiteSeo } from './scripts/site-seo'
import { getPrerenderWorkerCount } from './scripts/prerender/worker-count'
import {
  getLanguageEntryRoutes,
  getStaticLanguageEntryPaths,
} from './scripts/page-entries'

const prerenderWorkerCount = getPrerenderWorkerCount(
  process.env.NUXT_PRERENDER_WORKERS,
)
const defaultThemePalette = createMemberThemePalette(
  resolveMemberTheme(readMemberThemes(), defaultThemeId),
)

const contentPages = sitePages.map((page) =>
  page === 'home' ? '' : `/${page}`,
)

const prerenderRoutes = [
  ...siteLocales.flatMap((siteLocale) =>
    gameLocales.flatMap((gameLocale) =>
      contentPages.map((page) => `/${siteLocale}/${gameLocale}${page}`),
    ),
  ),
]
let languageEntryPaths: string[] = []

export default defineNuxtConfig({
  compatibilityDate: '2025-09-25',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://holodori.net',
    },
  },
  hooks: {
    'pages:extend': (pages) => {
      const entries = getLanguageEntryRoutes(
        pages,
        fileURLToPath(
          new URL('./app/components/LanguageEntry.vue', import.meta.url),
        ),
      )
      pages.push(...entries)
      languageEntryPaths = entries.map((entry) => entry.path)
    },
    'nitro:init': (nitro) => {
      nitro.hooks.hook('prerender:routes', (routes) => {
        for (const path of getStaticLanguageEntryPaths(languageEntryPaths)) {
          routes.add(path)
        }
      })

      if (prerenderWorkerCount > 1) {
        nitro.hooks.hook('prerender:config', (config) => {
          config.entry = fileURLToPath(
            new URL('./scripts/prerender/entry.ts', import.meta.url),
          )
        })
      }
    },
    'nitro:config': async () => {
      await generateSiteSeo(
        fileURLToPath(new URL('.', import.meta.url)),
        process.env.NUXT_PUBLIC_SITE_URL || 'https://holodori.net',
      )
    },
  },
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: 'anonymous',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap',
        },
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        {
          rel: 'icon',
          type: 'image/png',
          href: '/favicon-32.png',
          sizes: '32x32',
        },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
  modules: [
    '@nuxtjs/i18n',
    '@nuxt/eslint',
    '@vite-pwa/nuxt',
    '@nuxtjs/color-mode',
    '@primevue/nuxt-module',
  ],
  css: ['~/assets/css/main.css', '~/assets/css/generated.css'],
  colorMode: {
    preference: 'system',
    fallback: 'light',
    classPrefix: '',
    classSuffix: '',
    storage: 'localStorage',
    storageKey: 'holodori-color-mode',
  },
  primevue: {
    loadStyles: false,
    options: { theme: 'none' },
    components: {
      include: [...primeVueComponents],
    },
    directives: { include: [] },
  },
  vite: { plugins: [tailwindcss()] },
  typescript: {
    strict: true,
    typeCheck: true,
  },
  i18n: {
    strategy: 'prefix_and_default',
    defaultLocale: 'ja',
    locales: siteLocales.map((code) => ({
      code,
      file: `${code}.json`,
      ...siteLanguageMetadata[code],
    })),
    langDir: 'locales',
    detectBrowserLanguage: false,
  },
  pwa: {
    strategies: 'injectManifest',
    srcDir: '../service-worker',
    filename: 'sw.ts',
    injectRegister: false,
    client: {
      registerPlugin: false,
    },
    registerType: 'prompt',
    manifest: {
      id: '/',
      lang: 'ja',
      name: 'Holodori Database',
      short_name: 'Holodori',
      description: 'A database for exploring Holodori game information.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: defaultThemePalette.light.page.background,
      theme_color: defaultThemePalette.light.primary.color,
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: '/icons/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    includeAssets: [
      'favicon.ico',
      'favicon-32.png',
      'apple-touch-icon.png',
      'icons/icon-192.png',
      'icons/icon-512.png',
      'icons/icon-maskable-512.png',
    ],
    injectManifest: {
      globPatterns: ['**/*.{js,css,ico,png,svg,woff2}', '**/_i18n/**/*.json'],
      globIgnores: [
        '**/*_payload.json',
        '**/*.html',
        '**/200.html',
        '**/404.html',
      ],
    },
  },
  nitro: {
    prerender: {
      routes: prerenderRoutes,
      failOnError: true,
    },
  },
})
