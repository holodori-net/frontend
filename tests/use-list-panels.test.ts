import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { useListPanels } from '../app/composables/useListPanels.ts'

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

  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: storage,
  })
  const restoreStorage = () => {
    if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous)
    else Reflect.deleteProperty(globalThis, 'sessionStorage')
  }
  context = { state, mounted, restoreStorage }
  return { state, mounted }
}

function mount(target = context) {
  for (const callback of target?.mounted ?? []) callback()
}

afterEach(() => {
  context?.restoreStorage()
  context = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useListPanels', () => {
  it('uses page defaults and reads session storage only after mount', () => {
    const getItem = vi.fn(() => null)
    const setItem = vi.fn()
    start({ getItem, setItem } as unknown as Storage)
    const cards = useListPanels('cards')
    const songs = useListPanels('songs')

    expect(cards.panels.value).toEqual([])
    expect(songs.panels.value).toEqual([])
    expect(cards.initialized.value).toBe(false)
    expect(getItem).not.toHaveBeenCalled()

    mount()

    expect(getItem).toHaveBeenCalledWith('holodori-cards-panels')
    expect(getItem).toHaveBeenCalledWith('holodori-songs-panels')
    expect(setItem).not.toHaveBeenCalled()
    expect(cards.initialized.value).toBe(true)
    expect(songs.initialized.value).toBe(true)
  })

  it('restores a selection after reload', () => {
    const session = new Map([['holodori-cards-panels', '["display"]']])
    const storage = {
      getItem: vi.fn((key: string) => session.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => session.set(key, value)),
    } as unknown as Storage
    start(storage)
    const first = useListPanels('cards')
    mount()
    first.panels.value = ['filters']

    context?.restoreStorage()
    context = undefined
    vi.unstubAllGlobals()
    start(storage)
    const reloaded = useListPanels('cards')
    mount()

    expect(reloaded.panels.value).toEqual(['filters'])
  })

  it('shares state across remounts and language changes, while isolating pages', () => {
    const getItem = vi.fn(() => null)
    const storage = { getItem, setItem: vi.fn() } as unknown as Storage
    const { state } = start(storage)
    const cards = useListPanels('cards')
    const songs = useListPanels('songs')
    mount()
    cards.panels.value = ['filters']

    const remountedCards = useListPanels('cards')
    expect(remountedCards.panels.value).toEqual(['filters'])
    expect(useListPanels('songs').panels.value).toEqual([])
    expect(state.size).toBe(4)
    expect(getItem).toHaveBeenCalledTimes(2)
    expect(songs.initialized.value).toBe(true)
  })

  it.each(['{}', '"filters"', '["unknown"]', '["filters", 1]'])(
    'falls back on invalid session data %s',
    (value) => {
      start({
        getItem: vi.fn(() => value),
        setItem: vi.fn(),
      } as unknown as Storage)
      const panels = useListPanels('songs')
      mount()
      expect(panels.panels.value).toEqual([])
      expect(panels.initialized.value).toBe(true)
    },
  )

  it('accepts an empty array as a valid saved selection', () => {
    start({
      getItem: vi.fn(() => '[]'),
      setItem: vi.fn(),
    } as unknown as Storage)
    const panels = useListPanels('cards')
    mount()
    expect(panels.panels.value).toEqual([])
  })

  it('warns and keeps defaults when storage access fails', () => {
    const error = new Error('storage blocked')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start({
      getItem: vi.fn(() => {
        throw error
      }),
      setItem: vi.fn(),
    } as unknown as Storage)
    const panels = useListPanels('cards')
    mount()
    expect(panels.panels.value).toEqual([])
    expect(panels.initialized.value).toBe(true)
    expect(warning).toHaveBeenCalledWith(
      'Holodori list panel preference could not be read',
      error,
    )
  })

  it('keeps a selection in memory and warns when saving fails', () => {
    const error = new Error('write failed')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const setItem = vi.fn(() => {
      throw error
    })
    start({ getItem: vi.fn(() => null), setItem } as unknown as Storage)
    const panels = useListPanels('songs')
    mount()
    panels.panels.value = ['display']
    expect(panels.panels.value).toEqual(['display'])
    expect(setItem).toHaveBeenCalledWith('holodori-songs-panels', '["display"]')
    expect(warning).toHaveBeenCalledWith(
      'Holodori list panel preference could not be saved',
      error,
    )
  })
})
