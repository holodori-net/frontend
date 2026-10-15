<script setup lang="ts">
import { resolveLocalizedName, type GameLocale } from '#shared/language'
import type { CharacterListItemData } from '#shared/game-data/characters'
import { getCharacterIconUrl } from '#shared/game-data/character-list'

const props = defineProps<{
  character: CharacterListItemData
  gameLocale: GameLocale
}>()

const { t } = useI18n()
const imageUrl = computed(() => getCharacterIconUrl(props.character.assetId))
const {
  status: imageStatus,
  imageElement,
  onLoad,
  onError,
} = useImageLoading(imageUrl)
const hasIcon = computed(
  () => Boolean(imageUrl.value) && imageStatus.value !== 'failed',
)
const displayName = computed(() =>
  resolveLocalizedName(props.character.name, props.gameLocale),
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
</script>

<template>
  <li class="min-w-0">
    <article class="flex min-w-0 flex-col items-center gap-2 text-center">
      <div
        class="relative grid aspect-square w-full max-w-[7.5rem] select-none place-items-center overflow-hidden rounded-full border border-white/80 bg-surface-100 dark:bg-surface-800"
        :style="hasIcon ? undefined : fallbackBackground"
      >
        <Skeleton
          v-if="hasIcon && imageStatus === 'loading'"
          class="image-skeleton !absolute inset-0 rounded-full"
          width="100%"
          height="100%"
        />
        <img
          v-if="hasIcon"
          ref="imageElement"
          :key="imageUrl!"
          :src="imageUrl!"
          alt=""
          class="relative size-full select-none rounded-full object-contain"
          draggable="false"
          loading="lazy"
          decoding="async"
          @load="onLoad"
          @error="onError"
        />
        <span
          v-else
          class="px-2 text-xs leading-snug text-muted-color"
          :style="fallbackTextColor"
        >
          {{ t('characterIconUnavailable') }}
        </span>
      </div>
      <p
        class="m-0 w-full text-center text-sm leading-snug"
        :lang="displayName.lang"
      >
        {{ displayName.text }}
      </p>
    </article>
  </li>
</template>
