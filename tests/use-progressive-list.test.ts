import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, effectScope, ref, type Ref } from 'vue'
import { useProgressiveList } from '../app/composables/useProgressiveList.ts'

let frameCallbacks = new Map<number, FrameRequestCallback>()
let nextFrameId = 0
let state: Map<string, Ref<unknown>>

function start(
  isHydrating = false,
  initialState: Record<string, unknown> = {},
) {
  frameCallbacks = new Map()
  nextFrameId = 0
  state = new Map(
    Object.entries(initialState).map(([key, value]) => [key, ref(value)]),
  )
  vi.stubGlobal('useNuxtApp', () => ({ isHydrating }))
  vi.stubGlobal('useState', <T>(key: string, initialize: () => T) => {
    if (!state.has(key)) state.set(key, ref(initialize()) as Ref<unknown>)
    return state.get(key) as Ref<T>
  })
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++nextFrameId
    frameCallbacks.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frameCallbacks.delete(id)
  })
}

function runAnimationFrame() {
  const callbacks = [...frameCallbacks.values()]
  frameCallbacks.clear()
  callbacks.forEach((callback) => callback(0))
}

function paintFrame() {
  runAnimationFrame()
  vi.runOnlyPendingTimers()
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useProgressiveList', () => {
  it('keeps the complete list during hydration', () => {
    start(true)
    const scope = effectScope()
    const items = ref(Array.from({ length: 30 }, (_, index) => index))
    const result = scope.run(() =>
      useProgressiveList(
        computed(() => items.value),
        'cards',
      ),
    )!

    expect(result.visibleItems.value).toHaveLength(30)
    expect(result.isLoading.value).toBe(false)
    expect(frameCallbacks.size).toBe(0)
    scope.stop()
  })

  it('uses a serialized SSR marker when a lazy child starts after hydration', () => {
    start(false, { 'progressive-list-cards-ssr': true })
    const scope = effectScope()
    const items = ref(Array.from({ length: 30 }, (_, index) => index))
    const directLoad = scope.run(() =>
      useProgressiveList(
        computed(() => items.value),
        'cards',
      ),
    )!

    expect(directLoad.visibleItems.value).toHaveLength(30)
    expect(directLoad.isLoading.value).toBe(false)
    expect(state.get('progressive-list-cards-ssr')?.value).toBe(false)
    expect(frameCallbacks.size).toBe(0)

    const laterNavigation = scope.run(() =>
      useProgressiveList(
        computed(() => items.value),
        'cards',
      ),
    )!
    expect(laterNavigation.visibleItems.value).toHaveLength(12)
    expect(laterNavigation.isLoading.value).toBe(true)
    scope.stop()
  })

  it('renders in batches across frames until the full list is visible', () => {
    vi.useFakeTimers()
    start()
    const scope = effectScope()
    const items = ref(Array.from({ length: 29 }, (_, index) => index))
    const result = scope.run(() =>
      useProgressiveList(
        computed(() => items.value),
        'cards',
      ),
    )!

    expect(result.visibleItems.value).toEqual(
      Array.from({ length: 12 }, (_, index) => index),
    )
    expect(result.isLoading.value).toBe(true)

    paintFrame()
    expect(result.visibleItems.value).toHaveLength(24)
    expect(result.isLoading.value).toBe(true)

    paintFrame()
    expect(result.visibleItems.value).toHaveLength(29)
    expect(result.isLoading.value).toBe(false)
    scope.stop()
  })

  it('cancels pending batches and restarts from the first batch when results change', () => {
    vi.useFakeTimers()
    start()
    const scope = effectScope()
    const items = ref(Array.from({ length: 30 }, (_, index) => index))
    const result = scope.run(() =>
      useProgressiveList(
        computed(() => items.value),
        'cards',
      ),
    )!

    items.value = Array.from({ length: 20 }, (_, index) => index + 100)
    expect(result.visibleItems.value).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 100),
    )
    expect(frameCallbacks.size).toBe(1)

    paintFrame()
    expect(result.visibleItems.value).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 100),
    )
    expect(result.isLoading.value).toBe(false)
    scope.stop()
  })

  it('cancels a batch waiting for the next task when results change', () => {
    vi.useFakeTimers()
    start()
    const scope = effectScope()
    const items = ref(Array.from({ length: 20 }, (_, index) => index))
    const result = scope.run(() =>
      useProgressiveList(
        computed(() => items.value),
        'songs',
      ),
    )!

    runAnimationFrame()
    items.value = [100, 101, 102]
    vi.runOnlyPendingTimers()

    expect(result.visibleItems.value).toEqual([100, 101, 102])
    expect(result.isLoading.value).toBe(false)
    scope.stop()
  })

  it('cancels scheduled work when its scope is disposed', () => {
    vi.useFakeTimers()
    start()
    const scope = effectScope()
    const items = ref(Array.from({ length: 20 }, (_, index) => index))
    scope.run(() =>
      useProgressiveList(
        computed(() => items.value),
        'cards',
      ),
    )

    scope.stop()

    expect(frameCallbacks.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})
