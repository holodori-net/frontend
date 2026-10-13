<script setup lang="ts">
import type { GameLocale } from '#shared/language'
import type {
  CardListItemData,
  CardStatKey,
} from '#shared/game-data/card-list-data'
import {
  getCardAttributeIconUrl,
  getCardStatIconUrl,
} from '#shared/game-data/card-icons'
import { getCardImageUrl } from '#shared/game-data/card-list'

const props = defineProps<{
  card: CardListItemData
  gameLocale: GameLocale
  statKeys: CardStatKey[]
}>()

const { t, locale } = useI18n()
const imageFailed = ref(false)
const imageElement = ref<HTMLImageElement | null>(null)
const imageUrl = computed(() => getCardImageUrl(props.card.assetId))
const numberFormatter = computed(() => new Intl.NumberFormat(locale.value))
const hasImage = computed(() => Boolean(imageUrl.value) && !imageFailed.value)
const cardName = computed(
  () =>
    props.card.name[props.gameLocale] ||
    props.card.name.jpn ||
    props.card.name.eng,
)
const characterName = computed(
  () =>
    props.card.characterName[props.gameLocale] ||
    props.card.characterName.jpn ||
    props.card.characterName.eng,
)

watch([() => props.card.id, imageUrl], () => {
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
    <article
      class="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-surface-200 bg-surface-0 shadow-sm dark:border-surface-700 dark:bg-surface-900"
    >
      <div
        class="relative aspect-video w-full overflow-hidden bg-surface-100 dark:bg-surface-800"
      >
        <img
          v-if="hasImage"
          ref="imageElement"
          :src="imageUrl!"
          alt=""
          class="size-full object-contain"
          draggable="false"
          loading="lazy"
          decoding="async"
          @error="imageFailed = true"
        />
        <span
          v-else
          class="absolute inset-0 grid place-items-center px-3 text-center text-xs text-muted-color"
        >
          {{ t('cardList.imageUnavailable') }}
        </span>

        <div class="absolute left-1 top-1">
          <CardListIcon
            :src="getCardAttributeIconUrl(card.attributeType)"
            :label="t(`cardList.attribute${card.attributeType}`)"
            size="large"
          />
        </div>
        <div class="absolute bottom-1 left-1 top-11">
          <CardListRarity
            :count="card.rarity"
            :label="t('cardList.rarityOption', { count: card.rarity })"
            vertical
          />
        </div>
      </div>

      <div class="flex flex-1 flex-col gap-4 p-4">
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 items-start gap-2">
            <div
              v-if="card.specializations.length"
              class="flex max-w-[35%] shrink-0 flex-wrap gap-1"
            >
              <CardListIcon
                v-for="stat in card.specializations"
                :key="stat"
                :src="getCardStatIconUrl(stat)"
                :label="
                  t('cardList.specializationTag', {
                    stat: t(`cardList.stat.${stat}`),
                  })
                "
                monochrome
                size="small"
              />
            </div>
            <p
              class="mb-0 min-w-0 flex-1 text-base font-semibold leading-snug wrap-anywhere"
            >
              {{ cardName }}
            </p>
          </div>
          <p class="mb-0 mt-1 text-sm text-muted-color wrap-anywhere">
            {{ characterName }}
          </p>
        </div>

        <dl class="mt-auto grid grid-cols-4 gap-1 text-center text-xs">
          <div
            v-for="stat in statKeys"
            :key="stat"
            class="min-w-0 rounded-lg px-0.5 py-2"
            :class="
              card.specializations.includes(stat) &&
              'bg-primary/10 text-primary'
            "
          >
            <dt
              class="mb-1 flex min-h-7 items-center justify-center text-balance text-[0.6875rem] font-semibold leading-tight wrap-anywhere"
            >
              {{ t(`cardList.stat.${stat}`) }}
            </dt>
            <dd class="m-0 font-medium tabular-nums">
              {{ numberFormatter.format(card.stats[stat]) }}
            </dd>
          </div>
          <div
            class="min-w-0 rounded-lg bg-primary/10 px-0.5 py-2 text-primary"
          >
            <dt
              class="mb-1 flex min-h-7 items-center justify-center text-balance text-[0.6875rem] font-semibold leading-tight wrap-anywhere"
            >
              {{ t('cardList.total') }}
            </dt>
            <dd class="m-0 font-bold tabular-nums">
              {{ numberFormatter.format(card.total) }}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  </li>
</template>
