import { computed, onMounted, ref, watch, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import type {
  CardDetailGrowthData,
  CardGrowthSelection,
} from '#shared/game-data/cards/detail'
import {
  getMaxCardGrowth,
  selectCardGrowthLevel,
} from '#shared/game-data/cards/stats'

type SavedSelection = { cardId: string; selection: CardGrowthSelection }
type SavedMediaState = {
  cardId: string
  animate: boolean
  showSignature: boolean
}

export function useCardDetailState(options: {
  cardId: Ref<string>
  growth: Ref<CardDetailGrowthData>
  assetType: Ref<number>
  siteLocale: Ref<string>
  gameLocale: Ref<string>
}) {
  const persistedSelection = useState<SavedSelection | null>(
    'card-growth-selection',
    () => null,
  )
  const mediaState = useState<SavedMediaState | null>(
    'card-detail-media-state',
    () => null,
  )
  const maximum = computed(() => getMaxCardGrowth(options.growth.value))
  const selection = ref<CardGrowthSelection>(
    persistedSelection.value?.cardId === options.cardId.value
      ? selectCardGrowthLevel(
          options.growth.value,
          persistedSelection.value.selection,
        )
      : { ...maximum.value },
  )
  const normalizedSelection = computed(() =>
    selectCardGrowthLevel(options.growth.value, selection.value),
  )
  const fullscreenVisible = ref(false)
  const mediaEnabled = computed(() => options.assetType.value === 2)
  const mediaVariant = computed(() =>
    normalizedSelection.value.potentialUpgradeCount ===
    maximum.value.potentialUpgradeCount
      ? 'full_1'
      : 'full_0',
  )
  const animateCard = ref(true)
  const showSignature = ref(true)
  let hasSavedMediaState = mediaState.value?.cardId === options.cardId.value

  function restoreMediaState(cardId: string) {
    const saved = mediaState.value
    hasSavedMediaState = saved?.cardId === cardId
    if (saved?.cardId === cardId) {
      animateCard.value = saved.animate
      showSignature.value = saved.showSignature
    } else {
      animateCard.value = true
      showSignature.value = true
    }
  }

  function saveMediaState(cardId = options.cardId.value) {
    mediaState.value = {
      cardId,
      animate: animateCard.value,
      showSignature: showSignature.value,
    }
    hasSavedMediaState = true
  }

  restoreMediaState(options.cardId.value)
  watch([animateCard, showSignature], ([animate, signature]) => {
    mediaState.value = {
      cardId: options.cardId.value,
      animate,
      showSignature: signature,
    }
    hasSavedMediaState = true
  })
  watch([options.cardId, options.siteLocale, options.gameLocale], () => {
    fullscreenVisible.value = false
  })
  watch(options.cardId, (id) => {
    restoreMediaState(id)
    if (
      !hasSavedMediaState &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      animateCard.value = false
    if (!hasSavedMediaState) saveMediaState(id)
  })
  onMounted(() => {
    if (!hasSavedMediaState) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        animateCard.value = false
      saveMediaState()
    }
  })
  watch(
    selection,
    (value) => {
      persistedSelection.value = {
        cardId: options.cardId.value,
        selection: selectCardGrowthLevel(options.growth.value, value),
      }
    },
    { deep: true },
  )
  watch(options.cardId, (id) => {
    const saved = persistedSelection.value
    selection.value =
      saved?.cardId === id
        ? selectCardGrowthLevel(options.growth.value, saved.selection)
        : { ...maximum.value }
  })
  onBeforeRouteLeave((to) => {
    fullscreenVisible.value = false
    if (String(to.params.id) !== options.cardId.value) {
      persistedSelection.value = null
      mediaState.value = null
    }
  })

  return {
    maximum,
    selection,
    normalizedSelection,
    fullscreenVisible,
    mediaEnabled,
    mediaVariant,
    animateCard,
    showSignature,
  }
}
