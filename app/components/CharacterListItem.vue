<script setup lang="ts">
import type { GameLocale } from '#shared/language'
import type { CharacterListItemData } from '#shared/game-data/characters'
import { getCharacterIconUrl } from '#shared/game-data/character-list'

const props = defineProps<{
  character: CharacterListItemData
  gameLocale: GameLocale
}>()

const { t } = useI18n()
const imageFailed = ref(false)
const imageElement = ref<HTMLImageElement | null>(null)
const imageUrl = computed(() => getCharacterIconUrl(props.character.assetId))
const hasIcon = computed(() => Boolean(imageUrl.value) && !imageFailed.value)
const displayName = computed(
  () =>
    props.character.name[props.gameLocale] ||
    props.character.name.jpn ||
    props.character.name.eng,
)
const fallbackBackground = computed(() => {
  const color = props.character.color1
  return color && /^[\da-f]{6}$/i.test(color)
    ? { backgroundColor: `#${color}` }
    : undefined
})
const fallbackTextColor = computed(() =>
  fallbackBackground.value ? { color: '#172033' } : undefined,
)

watch([() => props.character.id, imageUrl], () => {
  imageFailed.value = false
})

onMounted(() => {
  if (imageElement.value?.complete && imageElement.value.naturalWidth === 0) {
    imageFailed.value = true
  }
})
</script>

<template>
  <li class="min-w-0">
    <article class="flex min-w-0 flex-col items-center gap-2 text-center">
      <div
        class="grid aspect-square w-full max-w-[7.5rem] select-none place-items-center overflow-hidden rounded-full border border-white/80 bg-surface-100 dark:bg-surface-800"
        :style="hasIcon ? undefined : fallbackBackground"
      >
        <img
          v-if="hasIcon"
          ref="imageElement"
          :src="imageUrl!"
          alt=""
          class="size-full select-none rounded-full object-contain"
          draggable="false"
          loading="lazy"
          decoding="async"
          @error="imageFailed = true"
        />
        <span
          v-else
          class="px-2 text-xs leading-snug text-muted-color"
          :style="fallbackTextColor"
        >
          {{ t('characterIconUnavailable') }}
        </span>
      </div>
      <p class="m-0 w-full text-center text-sm leading-snug">
        {{ displayName }}
      </p>
    </article>
  </li>
</template>
