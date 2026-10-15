import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { useCardLayout } from '../app/composables/useCardLayout.ts'

type TestContext = {
  state: Map<string, Ref<unknown>>
  mounted: Array<() => void>
  restoreStorage: () => void
}

let context: TestContext | undefined

function start(storage: Storage | null = null) {
  const state = new Map<string, Ref<unknown>>()
  const mounted: Array<() => void> = []
  vi.stubGlobal('useState', <T>(key: string, initial: () => T) => {
    if (!state.has(key)) state.set(key, ref(initial()) as Ref<unknown>)
    return state.get(key) as Ref<T>
  })
  vi.stubGlobal('onMounted', (callback: () => void) => mounted.push(callback))

  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  })
  const restoreStorage = () => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
  context = { state, mounted, restoreStorage }
  return { state, mounted }
}

function mount(contextToMount = context) {
  for (const callback of contextToMount?.mounted ?? []) callback()
}

afterEach(() => {
  context?.restoreStorage()
  context = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useCardLayout', () => {
  it.each([
    ['valid full preference', 'full', 'full'],
    ['valid preference', 'vertical', 'vertical'],
    ['missing preference', null, 'full'],
    ['invalid preference', 'poster', 'full'],
  ])('loads %s from localStorage', (_label, storedValue, expected) => {
    const getItem = vi.fn(() => storedValue)
    const setItem = vi.fn()
    start({ getItem, setItem } as unknown as Storage)

    const { layout, initialized } = useCardLayout()
    expect(layout.value).toBe('full')
    expect(initialized.value).toBe(false)

    mount()

    expect(getItem).toHaveBeenCalledWith('holodori-card-layout')
    expect(layout.value).toBe(expected)
    expect(initialized.value).toBe(true)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('warns with the read error and initializes to full when localStorage access fails', () => {
    const error = new Error('storage blocked')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { layout, initialized } =
      useCardLayoutWithThrowingStorageGetter(error)

    expect(initialized.value).toBe(false)
    mount()

    expect(layout.value).toBe('full')
    expect(initialized.value).toBe(true)
    expect(warning).toHaveBeenCalledWith(
      'Holodori card layout preference could not be read',
      error,
    )
  })

  it('warns when getItem throws and still marks initialization complete', () => {
    const error = new Error('read failed')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start({
      getItem: vi.fn(() => {
        throw error
      }),
      setItem: vi.fn(),
    } as unknown as Storage)
    const { layout, initialized } = useCardLayout()

    mount()

    expect(layout.value).toBe('full')
    expect(initialized.value).toBe(true)
    expect(warning).toHaveBeenCalledWith(
      'Holodori card layout preference could not be read',
      error,
    )
  })

  it('writes a changed layout after initialization', () => {
    const setItem = vi.fn()
    start({ getItem: vi.fn(() => 'full'), setItem } as unknown as Storage)
    const { layout } = useCardLayout()
    mount()

    layout.value = 'vertical'

    expect(setItem).toHaveBeenCalledTimes(1)
    expect(setItem).toHaveBeenCalledWith('holodori-card-layout', 'vertical')
  })

  it('shares layout and initialization across composable calls', () => {
    const getItem = vi.fn(() => 'vertical')
    const setItem = vi.fn()
    start({ getItem, setItem } as unknown as Storage)
    const first = useCardLayout()
    const second = useCardLayout()

    expect(first.initialized.value).toBe(false)
    first.layout.value = 'full'
    mount()

    expect(getItem).toHaveBeenCalledTimes(1)
    expect(first.layout.value).toBe('vertical')
    expect(second.layout.value).toBe('vertical')
    expect(second.initialized.value).toBe(true)
  })

  it('keeps the selected layout in memory after a write failure without rereading it', () => {
    const error = new Error('write failed')
    const getItem = vi.fn(() => null)
    const setItem = vi.fn(() => {
      throw error
    })
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start({ getItem, setItem } as unknown as Storage)
    const first = useCardLayout()
    mount()

    first.layout.value = 'vertical'
    const second = useCardLayout()
    mount()

    expect(first.layout.value).toBe('vertical')
    expect(second.layout.value).toBe('vertical')
    expect(getItem).toHaveBeenCalledTimes(1)
    expect(setItem).toHaveBeenCalledWith('holodori-card-layout', 'vertical')
    expect(warning).toHaveBeenCalledWith(
      'Holodori card layout preference could not be saved',
      error,
    )
  })

  it('warns and keeps the selection when the localStorage getter fails during write', () => {
    const error = new Error('storage getter failed')
    const storage = { getItem: vi.fn(() => 'full'), setItem: vi.fn() }
    let failGetter = false
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        if (failGetter) throw error
        return storage
      },
    })
    const { layout, initialized } = useCardLayout()
    mount()
    failGetter = true

    layout.value = 'vertical'

    expect(initialized.value).toBe(true)
    expect(layout.value).toBe('vertical')
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(warning).toHaveBeenCalledWith(
      'Holodori card layout preference could not be saved',
      error,
    )
  })
})

function useCardLayoutWithThrowingStorageGetter(error: Error) {
  start()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw error
    },
  })
  return useCardLayout()
}
