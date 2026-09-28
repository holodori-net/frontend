import { gameLocales } from './shared/language'

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
  modules: ['@nuxtjs/i18n', '@nuxt/eslint', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],
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
      background_color: '#f6f8f9',
      theme_color: '#297f79',
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
      ],
    },
    includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
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
