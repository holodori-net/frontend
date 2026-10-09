<script setup lang="ts">
import { isGameLocale, type GameLocale } from '#shared/language'
import type { CharacterData } from '#shared/game-data/characters'
import { getCharacterSections } from '#shared/game-data/character-list'

const route = useRoute()
const { t } = useI18n()
useHead(() => ({ title: `${t('characters')} | ${t('siteName')}` }))

definePageMeta({
  validate: (pageRoute) => isGameLocale(String(pageRoute.params.gameLocale)),
})

const gameLocale = computed(() => String(route.params.gameLocale) as GameLocale)
const showUnplayableCharacters = ref(false)
const {
  data: characters,
  error,
  pending,
  refresh,
} = await useFetch<CharacterData[]>('/api/characters.json')
watch(error, (fetchError) => {
  if (fetchError) {
    console.warn('Holodori character data load failed', fetchError)
  }
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
          />
        </div>
      </div>

      <p
        v-if="pending"
        class="py-16 text-center text-sm text-muted-color"
        role="status"
      >
        {{ t('charactersLoading') }}
      </p>
      <div
        v-else-if="error"
        class="grid justify-items-center gap-4 py-16 text-center"
      >
        <p class="m-0 text-sm text-muted-color" role="alert">
          {{ t('charactersLoadError') }}
        </p>
        <Button :label="t('retry')" severity="secondary" @click="refresh()" />
      </div>
      <p
        v-else-if="!hasCharacters"
        class="py-16 text-center text-sm text-muted-color"
      >
        {{ t('charactersEmpty') }}
      </p>
      <div v-else class="space-y-9">
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
