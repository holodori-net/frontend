import { gameLocales } from './shared/language'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'
import tailwindcss from '@tailwindcss/vite'

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
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'system',
    fallback: 'light',
    classPrefix: '',
    classSuffix: '',
    storage: 'localStorage',
    storageKey: 'holodori-color-mode',
  },
  primevue: {
    options: {
      theme: {
        preset: definePreset(Aura, {
          semantic: {
            primary: {
              50: '#FFF1F4',
              100: '#FFE0E8',
              200: '#FFC2D2',
              300: '#FF9AB4',
              400: '#F86D92',
              500: '#E94E78',
              600: '#C9345D',
              700: '#A9274C',
              800: '#8C2444',
              900: '#75233D',
              950: '#43101F',
            },
            colorScheme: {
              light: {
                primary: {
                  color: '{primary.600}',
                  contrastColor: '#ffffff',
                  hoverColor: '{primary.700}',
                  activeColor: '{primary.800}',
                },
                surface: {
                  0: '#ffffff',
                  50: '#FFF7FA',
                  100: '#FCEEF3',
                  200: '#F5E1E9',
                  300: '#EAD0DB',
                  400: '#CDAFBD',
                  500: '#A78B9A',
                  600: '#806675',
                  700: '#624B5A',
                  800: '#4C3142',
                  900: '#382330',
                  950: '#24151F',
                },
              },
              dark: {
                primary: {
                  color: '#FF8FA9',
                  contrastColor: '#32141F',
                  hoverColor: '#FFA9BC',
                  activeColor: '#FFC0CE',
                },
                surface: {
                  0: '#ffffff',
                  50: '#FCEFF4',
                  100: '#F5E3EA',
                  200: '#E9CCD8',
                  300: '#D2AFC0',
                  400: '#AF899D',
                  500: '#8A687C',
                  600: '#6B4E61',
                  700: '#503A4B',
                  800: '#392A37',
                  900: '#2C202C',
                  950: '#1F1722',
                },
              },
            },
          },
        }),
        options: {
          prefix: 'p',
          darkModeSelector: '.dark',
          cssLayer: {
            name: 'primevue',
            order: 'theme, base, primevue, components, utilities',
          },
        },
      },
    },
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
      background_color: '#FFF7FA',
      theme_color: '#C9345D',
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
