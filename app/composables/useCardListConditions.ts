import type { ComputedRef } from 'vue'
import {
  createCardListConditions,
  parseCardListQuery,
  toCardListQuery,
  type CardFilterOptions,
  type CardListConditions,
} from '#shared/game-data/card-list'

export function useCardListConditions(options: ComputedRef<CardFilterOptions>) {
  const route = useRoute()
  const router = useRouter()
  const conditions = ref<CardListConditions>(createCardListConditions())
  let ready = false
  let applyingRoute = false
  let suppressConditionWatch = false
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  const clearSearchTimer = () => {
    if (searchTimer !== undefined) clearTimeout(searchTimer)
    searchTimer = undefined
  }

  const updateFromRoute = () => {
    clearSearchTimer()
    const parsed = parseCardListQuery(route.query, options.value)
    applyingRoute = true
    conditions.value = parsed
    applyingRoute = false
  }

  const writeRoute = (replace: boolean) => {
    const query = toCardListQuery(conditions.value, route.query)
    const method = replace ? router.replace : router.push
    void method({ query, hash: route.hash })
  }

  onMounted(() => {
    updateFromRoute()
    ready = true
  })

  watch(
    () => route.fullPath,
    () => {
      if (ready) updateFromRoute()
    },
  )

  watch(
    () => ({
      ...conditions.value,
      character: [...conditions.value.character],
      rarity: [...conditions.value.rarity],
      attribute: [...conditions.value.attribute],
      specialization: [...conditions.value.specialization],
    }),
    (next, previous) => {
      if (!ready || applyingRoute || suppressConditionWatch) return

      const searchOnly =
        next.q !== previous.q &&
        next.character.join('\0') === previous.character.join('\0') &&
        next.rarity.join('\0') === previous.rarity.join('\0') &&
        next.attribute.join('\0') === previous.attribute.join('\0') &&
        next.specialization.join('\0') === previous.specialization.join('\0') &&
        next.layout === previous.layout &&
        next.sort === previous.sort &&
        next.direction === previous.direction

      clearSearchTimer()
      if (searchOnly) {
        searchTimer = setTimeout(() => writeRoute(true), 250)
      } else {
        writeRoute(false)
      }
    },
    { deep: true, flush: 'sync' },
  )

  onBeforeUnmount(clearSearchTimer)

  const reset = () => {
    clearSearchTimer()
    suppressConditionWatch = true
    conditions.value = {
      ...createCardListConditions(),
      layout: conditions.value.layout,
    }
    suppressConditionWatch = false
    writeRoute(false)
  }

  return { conditions, reset }
}
