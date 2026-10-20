import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { CARD_LIST_FIELDS } from '../shared/game-data/card-list.ts'
import { useCardFields } from '../app/composables/useCardFields.ts'

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

describe('useCardFields', () => {
  it.each([
    ['missing preference', null, [...CARD_LIST_FIELDS]],
    ['all fields', JSON.stringify(CARD_LIST_FIELDS), [...CARD_LIST_FIELDS]],
    [
      'existing full preference',
      '["name","characterName","parameters"]',
      ['name', 'characterName', 'parameters'],
    ],
    ['costume only', '["costume"]', ['costume']],
    ['partial preference', '["parameters","name"]', ['name', 'parameters']],
    ['empty preference', '[]', []],
    [
      'duplicates and noncanonical order',
      '["parameters","name","name"]',
      ['name', 'parameters'],
    ],
    ['malformed JSON', '[', [...CARD_LIST_FIELDS]],
    ['wrong shape', '"name"', [...CARD_LIST_FIELDS]],
    ['unknown field', '["name","unknown"]', [...CARD_LIST_FIELDS]],
  ])('loads %s from localStorage', (_label, storedValue, expected) => {
    const getItem = vi.fn(() => storedValue)
    const setItem = vi.fn()
    start({ getItem, setItem } as unknown as Storage)

    const { fields, initialized } = useCardFields()
    expect(fields.value).toEqual([...CARD_LIST_FIELDS])
    expect(initialized.value).toBe(false)

    mount()

    expect(getItem).toHaveBeenCalledWith('holodori-card-fields')
    expect(fields.value).toEqual(expected)
    expect(initialized.value).toBe(true)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('warns with the read error and initializes to all fields when localStorage access fails', () => {
    const error = new Error('storage blocked')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw error
      },
    })
    const { fields, initialized } = useCardFields()

    mount()

    expect(fields.value).toEqual([...CARD_LIST_FIELDS])
    expect(initialized.value).toBe(true)
    expect(warning).toHaveBeenCalledWith(
      'Holodori card fields preference could not be read',
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
    const { fields, initialized } = useCardFields()

    mount()

    expect(fields.value).toEqual([...CARD_LIST_FIELDS])
    expect(initialized.value).toBe(true)
    expect(warning).toHaveBeenCalledWith(
      'Holodori card fields preference could not be read',
      error,
    )
  })

  it('does not persist changes made before initialization', () => {
    const setItem = vi.fn()
    start({ getItem: vi.fn(() => '[]'), setItem } as unknown as Storage)
    const { fields } = useCardFields()

    fields.value = ['name']

    expect(setItem).not.toHaveBeenCalled()
    mount()
    expect(fields.value).toEqual([])
    expect(setItem).not.toHaveBeenCalled()
  })

  it('writes canonical fields after initialization', () => {
    const setItem = vi.fn()
    start({ getItem: vi.fn(() => null), setItem } as unknown as Storage)
    const { fields } = useCardFields()
    mount()

    fields.value = ['parameters', 'name', 'name']

    expect(setItem).toHaveBeenCalledTimes(1)
    expect(setItem).toHaveBeenCalledWith(
      'holodori-card-fields',
      '["name","parameters"]',
    )
  })

  it('shares fields and initialization across composable calls', () => {
    const getItem = vi.fn(() => '["characterName"]')
    const setItem = vi.fn()
    const mounted = start({ getItem, setItem } as unknown as Storage)
    const first = useCardFields()
    const second = useCardFields()
    mount({ ...mounted, restoreStorage: () => {} })

    expect(getItem).toHaveBeenCalledTimes(1)
    expect(first.fields.value).toEqual(['characterName'])
    expect(second.fields.value).toEqual(['characterName'])
    expect(second.initialized.value).toBe(true)
  })

  it('keeps the selected fields in memory after a write failure', () => {
    const error = new Error('write failed')
    const setItem = vi.fn(() => {
      throw error
    })
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start({ getItem: vi.fn(() => null), setItem } as unknown as Storage)
    const { fields } = useCardFields()
    mount()

    fields.value = ['characterName']

    expect(fields.value).toEqual(['characterName'])
    expect(warning).toHaveBeenCalledWith(
      'Holodori card fields preference could not be saved',
      error,
    )
  })

  it('warns and keeps the selection when the localStorage getter fails during write', () => {
    const error = new Error('storage getter failed')
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() }
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
    const { fields, initialized } = useCardFields()
    mount()
    failGetter = true

    fields.value = ['characterName']

    expect(initialized.value).toBe(true)
    expect(fields.value).toEqual(['characterName'])
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(warning).toHaveBeenCalledWith(
      'Holodori card fields preference could not be saved',
      error,
    )
  })
})
