import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import {
  getCardSkillAvailableLevels,
  type CardListField,
  type CardSkillLevelSelections,
} from '../shared/game-data/card-list.ts'
import { useCardFields } from '../app/composables/useCardFields.ts'

const available: CardSkillLevelSelections = {
  passiveSkill: [1, 2, 5],
  activeSkill: [1, 2],
  specialSkill: [1, 3],
}
const defaultFields: CardListField[] = [
  'name',
  'characterName',
  'parameters',
  'passiveSkill',
  'activeSkill',
  'costume',
]
const defaultLevels: CardSkillLevelSelections = {
  passiveSkill: [2],
  activeSkill: [2],
  specialSkill: [],
}

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

function makeStored(
  fields: CardListField[],
  skillLevels: CardSkillLevelSelections,
) {
  return JSON.stringify({ fields, skillLevels })
}

afterEach(() => {
  context?.restoreStorage()
  context = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('card skill field availability', () => {
  it('returns unique ascending levels from all skill groups', () => {
    expect(
      getCardSkillAvailableLevels({
        passiveSkills: {
          a: [{ level: 5 }, { level: 2 }],
          b: [{ level: 1 }, { level: 2 }],
        },
        activeSkills: { a: [{ level: 2 }, { level: 1 }] },
        specialSkills: { a: [{ level: 3 }, { level: 1 }] },
      }),
    ).toEqual({
      passiveSkill: [1, 2, 5],
      activeSkill: [1, 2],
      specialSkill: [1, 3],
    })
  })
})

describe('useCardFields', () => {
  it.each([
    ['missing preference', null, defaultFields, defaultLevels],
    [
      'legacy empty preference',
      '[]',
      [],
      { passiveSkill: [], activeSkill: [], specialSkill: [] },
    ],
    [
      'legacy preference keeps activation order',
      '["costume","activeSkill","name","passiveSkill"]',
      ['costume', 'activeSkill', 'name', 'passiveSkill'],
      defaultLevels,
    ],
    [
      'new preference retains selected levels and order',
      makeStored(['specialSkill', 'name', 'passiveSkill'], {
        passiveSkill: [5, 1, 5],
        activeSkill: [2],
        specialSkill: [3],
      }),
      ['specialSkill', 'name', 'passiveSkill'],
      { passiveSkill: [1, 5], activeSkill: [], specialSkill: [3] },
    ],
    ['malformed JSON', '[', defaultFields, defaultLevels],
    ['wrong shape', '"name"', defaultFields, defaultLevels],
    ['unknown field', '["name","unknown"]', defaultFields, defaultLevels],
    [
      'malformed skill levels',
      JSON.stringify({
        fields: ['name'],
        skillLevels: { passiveSkill: ['2'], activeSkill: [], specialSkill: [] },
      }),
      defaultFields,
      defaultLevels,
    ],
  ])(
    'loads %s from localStorage',
    (_label, stored, expectedFields, expectedLevels) => {
      const getItem = vi.fn(() => stored as string | null)
      const setItem = vi.fn()
      start({ getItem, setItem } as unknown as Storage)

      const result = useCardFields(available)
      expect(result.fields.value).toEqual(defaultFields)
      expect(result.skillLevels.value).toEqual(defaultLevels)
      expect(result.initialized.value).toBe(false)

      mount()

      expect(getItem).toHaveBeenCalledWith('holodori-card-fields')
      expect(result.fields.value).toEqual(expectedFields)
      expect(result.skillLevels.value).toEqual(expectedLevels)
      expect(result.initialized.value).toBe(true)
      expect(setItem).not.toHaveBeenCalled()
    },
  )

  it('defaults each enabled skill to level 2 only when available', () => {
    start({
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    } as unknown as Storage)
    const result = useCardFields(available)
    mount()

    expect(result.fields.value).toEqual(defaultFields)
    expect(result.skillLevels.value).toEqual(defaultLevels)
    expect(result.skillLevels.value.specialSkill).not.toContain(1)
  })

  it('preserves legacy selected fields and assigns level 2 only to enabled skill groups', () => {
    start({
      getItem: vi.fn(() => '["specialSkill","name","activeSkill"]'),
      setItem: vi.fn(),
    } as unknown as Storage)
    const result = useCardFields(available)
    mount()

    expect(result.fields.value).toEqual(['name', 'activeSkill'])
    expect(result.skillLevels.value).toEqual({
      passiveSkill: [],
      activeSkill: [2],
      specialSkill: [],
    })
  })

  it('appends ordinary fields when enabled and persists both state values together', () => {
    const setItem = vi.fn()
    start({ getItem: vi.fn(() => '[]'), setItem } as unknown as Storage)
    const result = useCardFields(available)
    mount()

    result.toggleField('name', true)
    result.toggleField('costume', true)

    expect(result.fields.value).toEqual(['name', 'costume'])
    expect(setItem).toHaveBeenLastCalledWith(
      'holodori-card-fields',
      makeStored(['name', 'costume'], {
        passiveSkill: [],
        activeSkill: [],
        specialSkill: [],
      }),
    )
  })

  it('resets reordered fields and skill levels to current defaults and persists them', () => {
    const setItem = vi.fn()
    start({
      getItem: vi.fn(() =>
        makeStored(['costume', 'specialSkill', 'name'], {
          passiveSkill: [],
          activeSkill: [],
          specialSkill: [1, 3],
        }),
      ),
      setItem,
    } as unknown as Storage)
    const result = useCardFields(available)
    mount()

    expect(result.fields.value).toEqual(['costume', 'specialSkill', 'name'])
    result.reset()

    expect(result.fields.value).toEqual(defaultFields)
    expect(result.skillLevels.value).toEqual(defaultLevels)
    expect(setItem).toHaveBeenLastCalledWith(
      'holodori-card-fields',
      makeStored(defaultFields, defaultLevels),
    )
  })

  it('keeps reset defaults in memory and warns when saving the reset fails', () => {
    const error = new Error('write failed')
    const setItem = vi.fn(() => {
      throw error
    })
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start({
      getItem: vi.fn(() =>
        makeStored(['costume'], {
          passiveSkill: [],
          activeSkill: [],
          specialSkill: [],
        }),
      ),
      setItem,
    } as unknown as Storage)
    const result = useCardFields(available)
    mount()

    result.reset()

    expect(result.fields.value).toEqual(defaultFields)
    expect(result.skillLevels.value).toEqual(defaultLevels)
    expect(setItem).toHaveBeenLastCalledWith(
      'holodori-card-fields',
      makeStored(defaultFields, defaultLevels),
    )
    expect(warning).toHaveBeenCalledWith(
      'Holodori card fields preference could not be saved',
      error,
    )
  })

  it('toggles all skill levels without moving a partially enabled group', () => {
    const setItem = vi.fn()
    start({
      getItem: vi.fn(() =>
        makeStored(['name', 'passiveSkill', 'costume'], {
          passiveSkill: [2],
          activeSkill: [],
          specialSkill: [],
        }),
      ),
      setItem,
    } as unknown as Storage)
    const result = useCardFields(available)
    mount()

    result.toggleField('passiveSkill', true)
    expect(result.fields.value).toEqual(['name', 'passiveSkill', 'costume'])
    expect(result.skillLevels.value.passiveSkill).toEqual([1, 2, 5])
  })

  it('adds, removes, and re-adds a skill group by its first and final selected level', () => {
    const setItem = vi.fn()
    start({
      getItem: vi.fn(() => '["parameters"]'),
      setItem,
    } as unknown as Storage)
    const result = useCardFields(available)
    mount()

    result.toggleSkillLevel('passiveSkill', 5, true)
    result.toggleSkillLevel('passiveSkill', 1, true)
    expect(result.fields.value).toEqual(['parameters', 'passiveSkill'])
    expect(result.skillLevels.value.passiveSkill).toEqual([1, 5])

    result.toggleSkillLevel('passiveSkill', 5, false)
    expect(result.fields.value).toEqual(['parameters', 'passiveSkill'])
    result.toggleSkillLevel('passiveSkill', 1, false)
    expect(result.fields.value).toEqual(['parameters'])
    result.toggleSkillLevel('passiveSkill', 2, true)
    expect(result.fields.value).toEqual(['parameters', 'passiveSkill'])
    expect(result.skillLevels.value.passiveSkill).toEqual([2])
    expect(setItem).toHaveBeenCalledTimes(5)
  })

  it('ignores levels that are not available', () => {
    const setItem = vi.fn()
    start({ getItem: vi.fn(() => '[]'), setItem } as unknown as Storage)
    const result = useCardFields(available)
    mount()

    result.toggleSkillLevel('specialSkill', 2, true)

    expect(result.fields.value).toEqual([])
    expect(setItem).not.toHaveBeenCalled()
  })

  it('intersects restored skill levels with the available levels', () => {
    start({
      getItem: vi.fn(() =>
        makeStored(['name', 'activeSkill'], {
          passiveSkill: [],
          activeSkill: [2, 5],
          specialSkill: [],
        }),
      ),
      setItem: vi.fn(),
    } as unknown as Storage)
    const result = useCardFields({
      passiveSkill: [1, 2, 5],
      activeSkill: [1, 5],
      specialSkill: [1, 3],
    })
    mount()

    expect(result.skillLevels.value.activeSkill).toEqual([5])
    expect(result.fields.value).toEqual(['name', 'activeSkill'])
  })

  it('removes a skill group when none of its restored levels are available', () => {
    start({
      getItem: vi.fn(() =>
        makeStored(['name', 'activeSkill'], {
          passiveSkill: [],
          activeSkill: [2, 5],
          specialSkill: [],
        }),
      ),
      setItem: vi.fn(),
    } as unknown as Storage)
    const result = useCardFields({
      passiveSkill: [1, 2, 5],
      activeSkill: [1],
      specialSkill: [1, 3],
    })
    mount()

    expect(result.skillLevels.value.activeSkill).toEqual([])
    expect(result.fields.value).toEqual(['name'])
  })

  it('appends an ordinary field to the end after it is removed and re-enabled', () => {
    start({
      getItem: vi.fn(() =>
        makeStored(['name', 'passiveSkill', 'costume', 'activeSkill'], {
          passiveSkill: [2],
          activeSkill: [2],
          specialSkill: [],
        }),
      ),
      setItem: vi.fn(),
    } as unknown as Storage)
    const result = useCardFields(available)
    mount()

    result.toggleField('name', false)
    expect(result.fields.value).toEqual([
      'passiveSkill',
      'costume',
      'activeSkill',
    ])
    result.toggleField('name', true)
    expect(result.fields.value).toEqual([
      'passiveSkill',
      'costume',
      'activeSkill',
      'name',
    ])
  })

  it('warns with read errors and uses defaults when localStorage access fails', () => {
    const error = new Error('storage blocked')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw error
      },
    })
    const result = useCardFields(available)

    mount()

    expect(result.fields.value).toEqual(defaultFields)
    expect(result.initialized.value).toBe(true)
    expect(warning).toHaveBeenCalledWith(
      'Holodori card fields preference could not be read',
      error,
    )
  })

  it('shares state and initialization across composable calls', () => {
    const getItem = vi.fn(() => '["characterName"]')
    const storage = { getItem, setItem: vi.fn() } as unknown as Storage
    const mounted = start(storage)
    const first = useCardFields(available)
    const second = useCardFields(available)
    mount({ ...mounted, restoreStorage: () => {} })

    expect(getItem).toHaveBeenCalledTimes(1)
    expect(first.fields.value).toEqual(['characterName'])
    expect(second.fields.value).toEqual(['characterName'])
    expect(second.initialized.value).toBe(true)
  })

  it('keeps memory state after a write failure', () => {
    const error = new Error('write failed')
    const setItem = vi.fn(() => {
      throw error
    })
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    start({ getItem: vi.fn(() => '[]'), setItem } as unknown as Storage)
    const result = useCardFields(available)
    mount()

    result.toggleField('name', true)

    expect(result.fields.value).toEqual(['name'])
    expect(warning).toHaveBeenCalledWith(
      'Holodori card fields preference could not be saved',
      error,
    )
  })
})
