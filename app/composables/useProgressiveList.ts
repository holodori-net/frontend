import { computed, onScopeDispose, ref, watch, type ComputedRef } from 'vue'

const DEFAULT_BATCH_SIZE = 12

type ProgressiveListPage = 'cards' | 'songs'

export function useProgressiveList<T>(
  items: ComputedRef<readonly T[]>,
  page: ProgressiveListPage,
  batchSize = DEFAULT_BATCH_SIZE,
) {
  const nuxtApp = useNuxtApp()
  const serverRenderedPage = useState(
    `progressive-list-${page}-ssr`,
    () => import.meta.server,
  )
  const renderAll =
    import.meta.server || nuxtApp.isHydrating || serverRenderedPage.value

  if (!import.meta.server && serverRenderedPage.value) {
    serverRenderedPage.value = false
  }

  const visibleCount = ref(
    renderAll ? items.value.length : Math.min(batchSize, items.value.length),
  )
  const visibleItems = computed(() => items.value.slice(0, visibleCount.value))
  const isLoading = computed(() => visibleCount.value < items.value.length)

  let frameId: number | undefined
  let timerId: ReturnType<typeof setTimeout> | undefined
  let generation = 0

  function cancelPendingBatch() {
    generation += 1
    if (frameId !== undefined) cancelAnimationFrame(frameId)
    if (timerId !== undefined) clearTimeout(timerId)
    frameId = undefined
    timerId = undefined
  }

  function scheduleNextBatch(expectedGeneration: number) {
    if (frameId !== undefined || timerId !== undefined) return

    frameId = requestAnimationFrame(() => {
      frameId = undefined
      timerId = setTimeout(() => {
        timerId = undefined
        if (generation !== expectedGeneration) return

        visibleCount.value = Math.min(
          visibleCount.value + batchSize,
          items.value.length,
        )

        if (visibleCount.value < items.value.length) {
          scheduleNextBatch(expectedGeneration)
        }
      }, 0)
    })
  }

  watch(
    items,
    (nextItems) => {
      cancelPendingBatch()
      visibleCount.value = renderAll
        ? nextItems.length
        : Math.min(batchSize, nextItems.length)

      if (!renderAll && visibleCount.value < nextItems.length) {
        scheduleNextBatch(generation)
      }
    },
    { flush: 'sync' },
  )

  if (!renderAll && visibleCount.value < items.value.length) {
    scheduleNextBatch(generation)
  }

  onScopeDispose(cancelPendingBatch)

  return { visibleItems, isLoading }
}
