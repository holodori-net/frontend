import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { SONG_LIST_FIELDS } from '../shared/game-data/song-list.ts'
import { useSongFields } from '../app/composables/useSongFields.ts'

type TestContext = { mounted: Array<() => void>; restoreStorage: () => void }
let context: TestContext | undefined

function start(storage: Storage) {
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
  context = { mounted, restoreStorage }
}

function mount() {
  for (const callback of context?.mounted ?? []) callback()
}
afterEach(() => {
  context?.restoreStorage()
  context = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const allFields = [
  'category',
  'duration',
  'charts',
  'title',
  'singer',
  'notes',
  'unlock',
  'availability',
  'musicVideos',
  'streamingMute',
]

describe('useSongFields', () => {
  it('uses the fixed field order and persists only the selected fields', () => {
    const getItem = vi.fn(() => null)
    const setItem = vi.fn()
    start({ getItem, setItem } as unknown as Storage)
    const result = useSongFields()
    mount()
    expect(SONG_LIST_FIELDS).toEqual(allFields)
    expect(result.fields.value).toEqual(allFields)
    result.toggleField('charts', false)
    expect(setItem).toHaveBeenCalledWith(
      'holodori-song-fields',
      JSON.stringify({
        fields: allFields.filter((field) => field !== 'charts'),
      }),
    )
    result.toggleField('charts', true)
    expect(result.fields.value).toEqual(allFields)
  })

  it('cleans removed fields, retains valid choices, and migrates new fields', () => {
    start({
      getItem: vi.fn(() =>
        JSON.stringify({
          fields: ['credits', 'title', 'charts', 'scoring', 'copyright'],
          chartDifficulties: [],
        }),
      ),
      setItem: vi.fn(),
    } as unknown as Storage)
    const result = useSongFields()
    mount()
    expect(result.fields.value).toEqual([
      'charts',
      'title',
      'notes',
      'streamingMute',
    ])
  })

  it('reads preferences without chart difficulties and preserves empty fields', () => {
    start({
      getItem: vi.fn(() => JSON.stringify({ fields: [] })),
      setItem: vi.fn(),
    } as unknown as Storage)
    const result = useSongFields()
    mount()
    expect(result.fields.value).toEqual([])
  })

  it('normalizes stored and toggled fields to the fixed display order', () => {
    start({
      getItem: vi.fn(() =>
        JSON.stringify({
          fields: ['unlock', 'title', 'charts', 'duration'],
        }),
      ),
      setItem: vi.fn(),
    } as unknown as Storage)
    const result = useSongFields()
    mount()
    expect(result.fields.value).toEqual([
      'duration',
      'charts',
      'title',
      'unlock',
    ])
    result.toggleField('category', true)
    expect(result.fields.value).toEqual([
      'category',
      'duration',
      'charts',
      'title',
      'unlock',
    ])
  })

  it('keeps memory state when storage writes fail and reset restores defaults', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start({
      getItem: vi.fn(() => JSON.stringify({ fields: [] })),
      setItem: vi.fn(() => {
        throw new Error('blocked')
      }),
    } as unknown as Storage)
    const result = useSongFields()
    mount()
    result.toggleField('notes', true)
    expect(result.fields.value).toEqual(['notes'])
    expect(warn).toHaveBeenCalled()
    result.reset()
    expect(result.fields.value).toEqual(allFields)
  })
})
