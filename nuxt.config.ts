import { gameLocales } from './shared/language'
import { primeVueComponents } from './shared/primevue'
import { defaultThemeId } from './shared/theme'
import { memberThemePalettes } from './app/themes/member-palettes'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { getPrerenderWorkerCount } from './scripts/prerender/worker-count'

const prerenderWorkerCount = getPrerenderWorkerCount(
  process.env.NUXT_PRERENDER_WORKERS,
)

const siteLocales = ['ja', 'en', 'zh-TW'] as const
const contentPages = ['', '/cards', '/settings']

const prerenderRoutes = [
  '/',
  '/cards',
  ...siteLocales.flatMap((siteLocale) =>
    gameLocales.flatMap((gameLocale) =>
      contentPages.map((page) => `/${siteLocale}/${gameLocale}${page}`),
    ),
  ),
]

export default defineNuxtConfig({
  compatibilityDate: '2025-09-25',
  devtools: { enabled: true },
  hooks: {
    'nitro:init': (nitro) => {
      if (prerenderWorkerCount > 1) {
        nitro.hooks.hook('prerender:config', (config) => {
          config.entry = fileURLToPath(
            new URL('./scripts/prerender/entry.ts', import.meta.url),
          )
        })
      }
    },
  },
  app: {
    head: {
      link: [
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
    locales: [
      { code: 'ja', language: 'ja-JP', file: 'ja.json', name: '日本語' },
      { code: 'en', language: 'en', file: 'en.json', name: 'English' },
      {
        code: 'zh-TW',
        language: 'zh-TW',
        file: 'zh-TW.json',
        name: '繁體中文',
      },
    ],
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
      background_color:
        memberThemePalettes[defaultThemeId]!.light.page.background,
      theme_color: memberThemePalettes[defaultThemeId]!.light.primary.color,
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
    },
  },
})
