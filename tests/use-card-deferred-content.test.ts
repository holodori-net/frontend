import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref, type Ref } from 'vue'
import { useCardDeferredContent } from '../app/composables/useCardDeferredContent.ts'

type TestContext = {
  mounted: Array<() => void>
  unmounted: Array<() => void>
  observers: MockResizeObserver[]
}

class MockResizeObserver {
  callback: ResizeObserverCallback
  disconnect = vi.fn()
  observe = vi.fn()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    context?.observers.push(this)
  }

  trigger(width: number, height = 0) {
    this.callback(
      [{ contentRect: { width, height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    )
  }
}

let context: TestContext | undefined

function start() {
  const state = new Map<string, Ref<unknown>>()
  const mounted: Array<() => void> = []
  const unmounted: Array<() => void> = []
  const observers: MockResizeObserver[] = []
  vi.stubGlobal('useState', <T>(key: string, initial: () => T) => {
    if (!state.has(key)) state.set(key, ref(initial()) as Ref<unknown>)
    return state.get(key) as Ref<T>
  })
  vi.stubGlobal('onMounted', (callback: () => void) => mounted.push(callback))
  vi.stubGlobal('onBeforeUnmount', (callback: () => void) =>
    unmounted.push(callback),
  )
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
  context = { mounted, unmounted, observers }
  return { mounted, unmounted, observers }
}

afterEach(() => {
  context = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useCardDeferredContent', () => {
  it('merges recheck requests until Vue has applied the current DOM update', async () => {
    start()
    const { revision, scheduleRecheck } = useCardDeferredContent(ref(null))

    scheduleRecheck()
    scheduleRecheck()
    expect(revision.value).toBe(0)

    await nextTick()
    expect(revision.value).toBe(1)
  })

  it('schedules a recheck when the list width changes and ignores height changes', async () => {
    const { observers, unmounted } = start()
    const container = ref({} as HTMLElement)
    const { revision } = useCardDeferredContent(container)
    const observer = observers[0]!

    observer.trigger(390, 500)
    observer.trigger(390, 700)
    await nextTick()
    expect(revision.value).toBe(0)

    observer.trigger(720, 700)
    await nextTick()
    expect(revision.value).toBe(1)

    unmounted.forEach((callback) => callback())
    expect(observer.disconnect).toHaveBeenCalledOnce()
    observer.trigger(900, 700)
    await nextTick()
    expect(revision.value).toBe(1)
  })

  it('stops queued rechecks after the page unmounts', async () => {
    const { unmounted } = start()
    const { revision, scheduleRecheck } = useCardDeferredContent(ref(null))

    scheduleRecheck()
    unmounted.forEach((callback) => callback())
    await nextTick()

    expect(revision.value).toBe(0)
  })

  it('rechecks after document fonts are ready', async () => {
    const { mounted } = start()
    vi.stubGlobal('document', { fonts: { ready: Promise.resolve() } })
    const { revision } = useCardDeferredContent(ref(null))

    mounted.forEach((callback) => callback())
    await Promise.resolve()
    await nextTick()

    expect(revision.value).toBe(1)
  })
})
