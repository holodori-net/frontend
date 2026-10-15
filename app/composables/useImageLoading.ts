import type { MaybeRefOrGetter } from 'vue'

export function useImageLoading(source: MaybeRefOrGetter<string | null>) {
  const imageElement = ref<HTMLImageElement | null>(null)
  const status = ref<'loading' | 'loaded' | 'failed'>(
    toValue(source) ? 'loading' : 'failed',
  )

  function reconcile(
    image: HTMLImageElement | null,
    expectedSource: string | null,
  ) {
    if (!expectedSource || !image?.complete) return
    if (image.getAttribute('src') !== expectedSource) return
    status.value = image.naturalWidth > 0 ? 'loaded' : 'failed'
  }

  function onLoad(event: Event) {
    const image = event.currentTarget as HTMLImageElement
    if (image.getAttribute('src') === toValue(source)) status.value = 'loaded'
  }

  function onError(event: Event) {
    const image = event.currentTarget as HTMLImageElement
    if (image.getAttribute('src') === toValue(source)) status.value = 'failed'
  }

  watch(
    () => toValue(source),
    async (nextSource) => {
      status.value = nextSource ? 'loading' : 'failed'
      await nextTick()
      reconcile(imageElement.value, nextSource)
    },
    { flush: 'sync' },
  )

  onMounted(async () => {
    await nextTick()
    reconcile(imageElement.value, toValue(source))
  })

  return { status, imageElement, onLoad, onError }
}
