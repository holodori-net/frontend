import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import {
  getSongListFieldGroups,
  type SongListField,
} from '../shared/game-data/song-list.ts'
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
  return { mounted }
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

describe('song list field groups', () => {
  it('keeps basic fields together at their first selected position', () => {
    expect(
      getSongListFieldGroups([
        'charts',
        'title',
        'credits',
        'duration',
        'singer',
      ]),
    ).toEqual([
      { key: 'charts', fields: ['charts'] },
      { key: 'basic', fields: ['title', 'duration', 'singer'] },
      { key: 'credits', fields: ['credits'] },
    ])
  })
})

describe('useSongFields', () => {
  it('loads defaults and persists field and difficulty selections together', () => {
    const getItem = vi.fn(() => null)
    const setItem = vi.fn()
    start({ getItem, setItem } as unknown as Storage)
    const result = useSongFields()
    expect(result.initialized.value).toBe(false)
    mount()
    expect(result.fields.value).toEqual([
      'title',
      'singer',
      'category',
      'duration',
      'charts',
      'credits',
    ])
    expect(result.chartDifficulties.value).toEqual([1, 2, 3, 4])
    result.toggleDifficulty(2, false)
    expect(setItem).toHaveBeenCalledWith(
      'holodori-song-fields',
      JSON.stringify({
        fields: [
          'title',
          'singer',
          'category',
          'duration',
          'charts',
          'credits',
        ],
        chartDifficulties: [1, 3, 4],
      }),
    )
  })

  it.each([
    [
      'valid preference',
      JSON.stringify({
        fields: ['credits', 'title', 'charts'],
        chartDifficulties: [4, 2, 4, 9],
      }),
      ['credits', 'title', 'charts'],
      [2, 4],
    ],
    [
      'empty fields',
      JSON.stringify({ fields: [], chartDifficulties: [] }),
      [],
      [],
    ],
    [
      'malformed preference',
      '{',
      ['title', 'singer', 'category', 'duration', 'charts', 'credits'],
      [1, 2, 3, 4],
    ],
  ])('loads %s from storage', (_label, stored, fields, difficulties) => {
    const getItem = vi.fn(() => stored as string)
    const setItem = vi.fn()
    start({ getItem, setItem } as unknown as Storage)
    const result = useSongFields()
    mount()
    expect(result.fields.value).toEqual(fields)
    expect(result.chartDifficulties.value).toEqual(difficulties)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('moves the charts group to the end after the last difficulty is removed and reselected', () => {
    start({
      getItem: vi.fn(() =>
        JSON.stringify({
          fields: ['title', 'charts', 'credits'],
          chartDifficulties: [1],
        }),
      ),
      setItem: vi.fn(),
    } as unknown as Storage)
    const result = useSongFields()
    mount()
    result.toggleDifficulty(1, false)
    expect(result.fields.value).toEqual(['title', 'credits'])
    result.toggleDifficulty(3, true)
    expect(result.fields.value).toEqual(['title', 'credits', 'charts'])
    expect(result.chartDifficulties.value).toEqual([3])
  })

  it('keeps memory state when storage writes fail and reset restores defaults', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start({
      getItem: vi.fn(() => '[]'),
      setItem: vi.fn(() => {
        throw new Error('blocked')
      }),
    } as unknown as Storage)
    const result = useSongFields()
    mount()
    result.toggleField('copyright' as SongListField, true)
    expect(result.fields.value).toEqual([
      'title',
      'singer',
      'category',
      'duration',
      'charts',
      'credits',
      'copyright',
    ])
    expect(warn).toHaveBeenCalled()
    result.reset()
    expect(result.fields.value).toEqual([
      'title',
      'singer',
      'category',
      'duration',
      'charts',
      'credits',
    ])
  })
})
