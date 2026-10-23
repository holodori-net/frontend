import { nextTick, watch, type Ref } from 'vue'

export function useCardDeferredContent(container: Ref<HTMLElement | null>) {
  const revision = useState('card-list-deferred-revision', () => 0)
  let active = true
  let scheduled = false
  let resizeObserver: ResizeObserver | undefined
  let lastWidth: number | undefined

  function scheduleRecheck() {
    if (scheduled || !active) return
    scheduled = true
    void nextTick(() => {
      scheduled = false
      if (!active) return
      revision.value += 1
    })
  }

  const stopWatching = watch(
    container,
    (element) => {
      resizeObserver?.disconnect()
      resizeObserver = undefined
      lastWidth = undefined
      if (!element || typeof ResizeObserver === 'undefined') return

      resizeObserver = new ResizeObserver(([entry]) => {
        if (!entry) return
        const width = entry.contentRect.width
        if (lastWidth === undefined) {
          lastWidth = width
          return
        }
        if (width === lastWidth) return
        lastWidth = width
        scheduleRecheck()
      })
      resizeObserver.observe(element)
    },
    { flush: 'post', immediate: true },
  )

  onMounted(() => {
    void document.fonts?.ready.then(() => scheduleRecheck())
  })

  onBeforeUnmount(() => {
    active = false
    stopWatching()
    resizeObserver?.disconnect()
    resizeObserver = undefined
  })

  return { revision, scheduleRecheck }
}
