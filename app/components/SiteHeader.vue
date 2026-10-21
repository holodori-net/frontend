<script setup lang="ts">
import { Monitor, Moon, SlidersHorizontal, Sun } from '@lucide/vue'
import {
  buildLocalizedPath,
  buildLocalizedRoute,
  gameLanguageOptions,
  isGameLocale,
  resolveLocalizedName,
  siteLanguageOptions,
  sitePages,
  type GameLocale,
  type SiteLocale,
} from '#shared/language'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const colorMode = useColorMode()
const { selectedThemeId, theme, themes } = useMemberTheme()
const activeGameLocale = computed(() => {
  const value = route.params.gameLocale
  return typeof value === 'string' && isGameLocale(value) ? value : 'jpn'
})
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

const localizedRoute = (site: SiteLocale, game: GameLocale) =>
  buildLocalizedRoute(site, game, route)
const themeName = computed(() =>
  resolveLocalizedName(theme.value.name, activeGameLocale.value),
)
const themeOptions = computed(() =>
  (themes.value ?? []).map((memberTheme) => {
    const name = resolveLocalizedName(memberTheme.name, activeGameLocale.value)
    return {
      ...memberTheme,
      ...name,
      label: name.text,
      searchNames: Object.values(memberTheme.name).join(' '),
    }
  }),
)
const appearanceOptions = computed(() => [
  { value: 'system', label: t('modeSystem'), icon: Monitor },
  { value: 'light', label: t('modeLight'), icon: Sun },
  { value: 'dark', label: t('modeDark'), icon: Moon },
])

function togglePreferences(event: Event) {
  preferencesPopover.value?.toggle(event)
}

function closePreferences() {
  preferencesPopover.value?.hide()
}

async function chooseSiteLocale(value: SiteLocale) {
  if (value === locale.value) return
  preferredSiteLocale.value = value
  await router.replace(localizedRoute(value, activeGameLocale.value))
  closePreferences()
}

async function chooseGameLocale(value: GameLocale) {
  if (value === activeGameLocale.value) return
  preferredGameLocale.value = value
  await router.replace(localizedRoute(locale.value as SiteLocale, value))
  closePreferences()
}
</script>

<template>
  <header
    class="theme-site-header sticky top-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-0 border-b px-4 sm:h-14 sm:flex-nowrap sm:px-6 md:gap-x-6"
  >
    <NuxtLink
      class="inline-flex h-14 shrink-0 items-center gap-2.5 font-bold whitespace-nowrap text-primary sm:h-full"
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
      class="order-3 flex h-9 basis-full flex-none items-center gap-4 text-sm text-muted-color sm:order-none sm:h-full sm:basis-auto sm:flex-1 md:gap-6"
      :aria-label="t('home')"
    >
      <NuxtLink
        v-for="page in sitePages"
        :key="page"
        class="inline-flex h-full items-center [&.router-link-active]:text-primary [&.router-link-active]:shadow-[inset_0_-2px_var(--p-primary-color)]"
        :to="buildLocalizedPath(locale as SiteLocale, activeGameLocale, page)"
        >{{ t(page) }}</NuxtLink
      >
    </nav>
    <Button
      class="ml-auto !size-11 !p-0 shrink-0"
      text
      rounded
      :aria-label="t('displaySettings')"
      :title="t('displaySettings')"
      :aria-haspopup="'dialog'"
      aria-controls="display-preferences"
      :aria-expanded="preferencesOpen"
      @click="togglePreferences"
    >
      <SlidersHorizontal
        aria-hidden="true"
        :size="20"
        :stroke-width="2"
        color="currentColor"
      />
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
            >
              <template #option="{ option }">
                <span :lang="option.lang">{{ option.label }}</span>
              </template>
              <template #value="{ value }">
                <span
                  :lang="
                    siteLanguageOptions.find((option) => option.value === value)
                      ?.lang
                  "
                >
                  {{
                    siteLanguageOptions.find((option) => option.value === value)
                      ?.label
                  }}
                </span>
              </template>
            </Select>
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
            >
              <template #option="{ option }">
                <span :lang="option.lang">{{ option.label }}</span>
              </template>
              <template #value="{ value }">
                <span
                  :lang="
                    gameLanguageOptions.find((option) => option.value === value)
                      ?.lang
                  "
                >
                  {{
                    gameLanguageOptions.find((option) => option.value === value)
                      ?.label
                  }}
                </span>
              </template>
            </Select>
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
              <component
                :is="option.icon"
                aria-hidden="true"
                :size="20"
                :stroke-width="2"
                color="currentColor"
              />
            </button>
          </div>
        </fieldset>
        <label class="grid gap-2 text-sm font-medium">
          {{ t('themeTitle') }}
          <Select
            v-model="selectedThemeId"
            :options="themeOptions"
            option-label="label"
            option-value="id"
            :filter-fields="['searchNames', 'id']"
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
                <MemberThemeAvatar
                  :src="theme.assets.avatar"
                  :color="theme.color1"
                />
                <span class="game-text truncate" :lang="themeName.lang">{{
                  themeName.text
                }}</span>
                <span class="ml-auto flex shrink-0 gap-1" aria-hidden="true">
                  <span
                    class="size-3 rounded-full border border-surface-400/50"
                    :style="{ backgroundColor: theme.color2 }"
                  />
                  <span
                    class="size-3 rounded-full border border-surface-400/50"
                    :style="{ backgroundColor: theme.color3 }"
                  />
                </span>
              </span>
              <span v-else>{{ t('selectMemberTheme') }}</span>
            </template>
            <template #option="slotProps">
              <span class="flex min-w-0 items-center gap-3">
                <MemberThemeAvatar
                  :src="slotProps.option.assets.avatar"
                  :color="slotProps.option.color1"
                />
                <span class="flex shrink-0 gap-1" aria-hidden="true">
                  <span
                    class="size-3 rounded-full border border-surface-400/50"
                    :style="{ backgroundColor: slotProps.option.color2 }"
                  />
                  <span
                    class="size-3 rounded-full border border-surface-400/50"
                    :style="{ backgroundColor: slotProps.option.color3 }"
                  />
                </span>
                <span class="grid min-w-0">
                  <span
                    class="game-text truncate"
                    :lang="slotProps.option.lang"
                    >{{ slotProps.option.text }}</span
                  >
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
