<script setup lang="ts">
import {
  buildLocalizedPath,
  isGameLocale,
  type GameLocale,
  type SiteLocale,
} from '#shared/language'
import { memberThemes } from '#shared/theme'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const colorMode = useColorMode()
const { selectedThemeId, theme } = useMemberTheme()
const preferencesPopover = ref<{
  toggle: (event: Event) => void
  hide: () => void
} | null>(null)
const preferencesOpen = ref(false)
const preferredSiteLocale = useCookie<string | null>('holodori-site-locale', {
  default: () => null,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})
const preferredGameLocale = useCookie<string | null>('holodori-game-locale', {
  default: () => null,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

const activeGameLocale = computed(() => {
  const value = route.params.gameLocale
  return typeof value === 'string' && isGameLocale(value) ? value : 'jpn'
})
const pageKind = computed(() => {
  if (route.path.endsWith('/cards')) return 'cards'
  if (route.path.endsWith('/settings')) return 'settings'
  return 'home'
})
const siteLanguageOptions = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
  { value: 'zh-TW', label: '繁體中文' },
]
const gameLanguageOptions = [
  { value: 'jpn', label: '日本語' },
  { value: 'eng', label: 'English' },
  { value: 'ind', label: 'Bahasa Indonesia' },
  { value: 'kor', label: '한국어' },
  { value: 'cht', label: '繁體中文' },
  { value: 'chs', label: '简体中文' },
]
const themeOptions = computed(() => Object.values(memberThemes))
const appearanceOptions = computed(() => [
  { value: 'system', label: t('modeSystem'), icon: 'computer' },
  { value: 'light', label: t('modeLight'), icon: 'sun' },
  { value: 'dark', label: t('modeDark'), icon: 'moon' },
])

function togglePreferences(event: Event) {
  preferencesPopover.value?.toggle(event)
}

function closePreferences() {
  preferencesPopover.value?.hide()
}

function hideBrokenAvatar(event: Event) {
  ;(event.currentTarget as HTMLImageElement).hidden = true
}

async function chooseSiteLocale(value: SiteLocale) {
  if (value === locale.value) return
  preferredSiteLocale.value = value
  await router.replace(
    buildLocalizedPath(value, activeGameLocale.value, pageKind.value),
  )
  closePreferences()
}

async function chooseGameLocale(value: GameLocale) {
  if (value === activeGameLocale.value) return
  preferredGameLocale.value = value
  await router.replace(
    buildLocalizedPath(locale.value as SiteLocale, value, pageKind.value),
  )
  closePreferences()
}
</script>

<template>
  <header
    class="flex min-h-[4.75rem] flex-wrap items-center gap-x-10 gap-y-3 border-b border-surface-200 bg-surface-0/95 px-5 py-3 backdrop-blur dark:border-surface-700 dark:bg-surface-900/95 sm:px-8 lg:px-[max(2rem,calc((100vw-1160px)/2))]"
  >
    <NuxtLink
      class="inline-flex shrink-0 items-center gap-2.5 font-bold whitespace-nowrap"
      :to="buildLocalizedPath(locale as SiteLocale, activeGameLocale, 'home')"
    >
      <img
        class="size-8 rounded-xl object-cover"
        src="/icons/icon-192.png"
        alt=""
      />
      <span>{{ t('siteName') }}</span>
    </NuxtLink>
    <nav
      class="order-3 flex h-9 w-full flex-1 items-center gap-6 text-sm text-muted-color sm:order-none sm:h-[4.75rem] sm:w-auto"
      :aria-label="t('home')"
    >
      <NuxtLink
        class="inline-flex h-full items-center [&.router-link-active]:text-primary [&.router-link-active]:shadow-[inset_0_-2px_var(--p-primary-color)]"
        :to="buildLocalizedPath(locale as SiteLocale, activeGameLocale, 'home')"
        >{{ t('home') }}</NuxtLink
      >
      <NuxtLink
        class="inline-flex h-full items-center [&.router-link-active]:text-primary [&.router-link-active]:shadow-[inset_0_-2px_var(--p-primary-color)]"
        :to="
          buildLocalizedPath(locale as SiteLocale, activeGameLocale, 'cards')
        "
        >{{ t('cards') }}</NuxtLink
      >
      <NuxtLink
        class="inline-flex h-full items-center [&.router-link-active]:text-primary [&.router-link-active]:shadow-[inset_0_-2px_var(--p-primary-color)]"
        :to="
          buildLocalizedPath(locale as SiteLocale, activeGameLocale, 'settings')
        "
        >{{ t('settings') }}</NuxtLink
      >
    </nav>
    <Button
      class="ml-auto !size-11 !p-0"
      severity="secondary"
      text
      rounded
      :aria-label="t('displaySettings')"
      :aria-haspopup="'dialog'"
      aria-controls="display-preferences"
      :aria-expanded="preferencesOpen"
      @click="togglePreferences"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="size-5">
        <path
          d="M4 7h7m4 0h5M4 17h3m4 0h9M11 4v6m-4 4v6"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
    </Button>
    <Popover
      ref="preferencesPopover"
      :breakpoints="{ '640px': 'calc(100vw - 2rem)' }"
      class="!w-[min(25rem,calc(100vw-2rem))]"
      @show="preferencesOpen = true"
      @hide="preferencesOpen = false"
    >
      <section
        id="display-preferences"
        class="grid gap-6"
        :aria-label="t('displaySettings')"
      >
        <h2 class="mb-0 text-lg font-semibold">{{ t('displaySettings') }}</h2>
        <div class="grid gap-4">
          <label class="grid gap-2 text-sm font-medium">
            {{ t('siteLanguage') }}
            <Select
              :model-value="locale"
              :options="siteLanguageOptions"
              option-label="label"
              option-value="value"
              :aria-label="t('siteLanguage')"
              append-to="self"
              class="w-full"
              @update:model-value="chooseSiteLocale"
            />
          </label>
          <label class="grid gap-2 text-sm font-medium">
            {{ t('gameLanguage') }}
            <Select
              :model-value="activeGameLocale"
              :options="gameLanguageOptions"
              option-label="label"
              option-value="value"
              :aria-label="t('gameLanguage')"
              append-to="self"
              class="w-full"
              @update:model-value="chooseGameLocale"
            />
          </label>
        </div>
        <fieldset class="grid gap-3 border-0 p-0">
          <legend class="text-sm font-medium">{{ t('colorModeTitle') }}</legend>
          <div
            class="grid grid-cols-3 rounded-xl bg-surface-100 p-1 dark:bg-surface-800"
            role="group"
            :aria-label="t('colorModeTitle')"
          >
            <button
              v-for="option in appearanceOptions"
              :key="option.value"
              type="button"
              class="grid min-h-10 place-items-center rounded-lg text-primary transition-colors hover:bg-surface-0/70 dark:hover:bg-surface-700"
              :class="
                colorMode.preference === option.value
                  ? 'bg-surface-0 shadow-sm dark:bg-surface-700'
                  : ''
              "
              :aria-label="option.label"
              :aria-pressed="colorMode.preference === option.value"
              :title="option.label"
              @click="colorMode.preference = option.value"
            >
              <svg
                v-if="option.icon === 'computer'"
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                class="size-5"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="13"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="1.8"
                />
                <path
                  d="M8 21h8m-4-4v4"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
              </svg>
              <svg
                v-else-if="option.icon === 'sun'"
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                class="size-5"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="4"
                  stroke="currentColor"
                  stroke-width="1.8"
                />
                <path
                  d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
              </svg>
              <svg
                v-else
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                class="size-5"
              >
                <path
                  d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </fieldset>
        <label class="grid gap-2 text-sm font-medium">
          {{ t('themeTitle') }}
          <Select
            v-model="selectedThemeId"
            :options="themeOptions"
            option-label="name"
            option-value="id"
            :filter-fields="['name', 'id']"
            :filter-placeholder="t('searchMembers')"
            :aria-label="t('themeTitle')"
            :virtual-scroller-options="
              themeOptions.length > 50
                ? { itemSize: 56, showLoader: false }
                : undefined
            "
            append-to="self"
            size="large"
            filter
            class="w-full"
          >
            <template #value="slotProps">
              <span
                v-if="slotProps.value"
                class="flex min-w-0 items-center gap-3"
              >
                <span
                  class="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <span class="col-start-1 row-start-1">✿</span>
                  <img
                    v-if="theme.assets.avatar"
                    :key="theme.assets.avatar"
                    :src="theme.assets.avatar"
                    alt=""
                    class="col-start-1 row-start-1 size-full rounded-full object-cover"
                    @error="hideBrokenAvatar"
                  />
                </span>
                <span class="truncate">{{ theme.name }}</span>
              </span>
              <span v-else>{{ t('selectMemberTheme') }}</span>
            </template>
            <template #option="slotProps">
              <span class="flex min-w-0 items-center gap-3">
                <span
                  class="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <span class="col-start-1 row-start-1">✿</span>
                  <img
                    v-if="slotProps.option.assets.avatar"
                    :key="slotProps.option.assets.avatar"
                    :src="slotProps.option.assets.avatar"
                    alt=""
                    class="col-start-1 row-start-1 size-full rounded-full object-cover"
                    @error="hideBrokenAvatar"
                  />
                </span>
                <span class="grid min-w-0">
                  <span class="truncate">{{ slotProps.option.name }}</span>
                  <span class="truncate text-xs text-muted-color">{{
                    slotProps.option.id
                  }}</span>
                </span>
              </span>
            </template>
          </Select>
        </label>
      </section>
    </Popover>
  </header>
</template>
