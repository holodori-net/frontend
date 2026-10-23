<script setup lang="ts">
import { isGameLocale, type GameLocale } from '#shared/language'
import { pageDataPaths } from '#shared/page-data'
import type { CharacterListItemData } from '#shared/game-data/characters'
import { getCharacterSections } from '#shared/game-data/character-list'

const route = useRoute()
const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
useHead(() => ({ title: `${t('characters')} | ${t('siteName')}` }))

definePageMeta({
  validate: (pageRoute) => isGameLocale(String(pageRoute.params.gameLocale)),
})

const gameLocale = computed(() => String(route.params.gameLocale) as GameLocale)
const showUnplayableCharacters = ref(false)
const prerenderedCharacters = useState<CharacterListItemData[] | null>(
  'prerendered-character-list',
  () => null,
)
if (import.meta.server) {
  onServerPrefetch(async () => {
    const { readCharacterList } = await import('~~/server/data/character-list')
    prerenderedCharacters.value = readCharacterList()
  })
}
const {
  data: fetchedCharacters,
  error,
  status,
  refresh,
} = useLazyAsyncData<CharacterListItemData[]>(
  'character-list',
  (_nuxtApp, { signal }) =>
    $fetch<CharacterListItemData[]>(pageDataPaths.characters, {
      signal,
      query: { _b: runtimeConfig.app.buildId },
      retry: 0,
    }),
  {
    server: false,
    getCachedData: (_key, _nuxtApp, { cause }) =>
      cause === 'initial'
        ? (prerenderedCharacters.value ?? undefined)
        : undefined,
  },
)
const characters = computed(
  () => fetchedCharacters.value ?? prerenderedCharacters.value,
)
watch(error, (value) => {
  if (value) console.error('Holodori character data loading failed', value)
})
const visibleCharacters = computed(() =>
  (characters.value ?? []).filter(
    (character) => showUnplayableCharacters.value || character.isPlayable,
  ),
)
const sections = computed(() => getCharacterSections(visibleCharacters.value))
const hasCharacters = computed(() =>
  sections.value.some((section) => section.characters.length > 0),
)
</script>

<template>
  <div class="min-h-screen">
    <SiteHeader />
    <main
      class="mx-auto w-[min(calc(100%-2rem),65.625rem)] py-8 pb-20 sm:py-12"
    >
      <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 class="mb-0 text-2xl font-bold sm:text-3xl">
          {{ t('characters') }}
        </h1>
        <div class="flex items-center gap-3">
          <label for="show-unplayable-characters" class="text-sm">
            {{ t('showUnplayableCharacters') }}
          </label>
          <ToggleSwitch
            v-model="showUnplayableCharacters"
            input-id="show-unplayable-characters"
            :disabled="!characters"
          />
        </div>
      </div>

      <div
        v-if="status === 'error'"
        class="py-16 text-center text-sm text-muted-color"
        role="alert"
      >
        <p class="mb-4">{{ t('pageLoadFailed') }}</p>
        <Button type="button" :label="t('retry')" @click="refresh()" />
      </div>
      <div
        v-else-if="!characters"
        class="py-16 text-center text-sm text-muted-color"
        role="status"
      >
        <p class="mb-4">{{ t('pageLoading') }}</p>
      </div>
      <p
        v-else-if="!hasCharacters"
        class="py-16 text-center text-sm text-muted-color"
      >
        {{ t('charactersEmpty') }}
      </p>
      <div v-else-if="characters" class="space-y-9">
        <section
          v-for="section in sections"
          :key="section.id"
          :aria-labelledby="`character-group-${section.id}`"
        >
          <h2
            :id="`character-group-${section.id}`"
            class="mb-4 text-base font-semibold"
          >
            {{ section.name ?? t('charactersOtherGroup') }}
          </h2>
          <ul
            class="grid list-none grid-cols-3 gap-x-3 gap-y-6 p-0 min-[520px]:grid-cols-4 min-[760px]:grid-cols-5 min-[1001px]:grid-cols-6"
            :aria-label="section.name ?? t('charactersOtherGroup')"
          >
            <CharacterListItem
              v-for="character in section.characters"
              :key="character.id"
              :character="character"
              :game-locale="gameLocale"
            />
          </ul>
        </section>
      </div>
    </main>
  </div>
</template>
