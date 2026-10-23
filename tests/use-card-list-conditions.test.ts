import {
  computed,
  createRenderer,
  defineComponent,
  h,
  nextTick,
  reactive,
  type App,
} from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CardFilterOptions } from '../shared/game-data/card-list.ts'
import { useCardListConditions } from '../app/composables/useCardListConditions.ts'

const codecControls = vi.hoisted(() => ({
  decode: undefined as ((value: string) => Promise<string[]>) | undefined,
  encode: undefined as
    ((ids: readonly string[]) => Promise<string | undefined>) | undefined,
}))

vi.mock('#shared/game-data/card-skill-query', async () => {
  const actual = await vi.importActual<
    typeof import('../shared/game-data/card-skill-query.ts')
  >('../shared/game-data/card-skill-query.ts')
  return {
    ...actual,
    decodeCardSkillSelection: (value: string) =>
      codecControls.decode?.(value) ?? actual.decodeCardSkillSelection(value),
    encodeCardSkillSelection: (ids: readonly string[]) =>
      codecControls.encode?.(ids) ?? actual.encodeCardSkillSelection(ids),
  }
})

type HostNode = {
  type?: string
  text?: string
  children: HostNode[]
  parent?: HostNode
}

const renderer = createRenderer<HostNode, HostNode>({
  createElement: (type) => ({ type, children: [] }),
  createText: (text) => ({ text, children: [] }),
  createComment: (text) => ({ text, children: [] }),
  setText: (node, text) => {
    node.text = text
  },
  setElementText: (node, text) => {
    node.text = text
    node.children = []
  },
  parentNode: (node) => node.parent ?? null,
  nextSibling: (node) => {
    if (!node.parent) return null
    return node.parent.children[node.parent.children.indexOf(node) + 1] ?? null
  },
  insert: (node, parent, anchor) => {
    node.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index < 0) parent.children.push(node)
    else parent.children.splice(index, 0, node)
  },
  remove: (node) => {
    if (!node.parent) return
    const index = node.parent.children.indexOf(node)
    if (index >= 0) node.parent.children.splice(index, 1)
    node.parent = undefined
  },
})

const options: CardFilterOptions = {
  character: ['chr-a', 'chr-b'],
  skill: ['passive:p1', 'active:a1'],
  connect: ['extent-a', 'extent-b'],
  rarity: [3, 4, 5],
  attribute: [1, 2, 3],
  specialization: ['performance', 'technique', 'sense'],
}

function mountComposable(query: Record<string, unknown> = {}) {
  const route = reactive({ fullPath: '/ja/jpn/cards', query, hash: '' })
  const push = vi.fn((..._args: unknown[]): Promise<unknown> =>
    Promise.resolve(),
  )
  const replace = vi.fn((..._args: unknown[]): Promise<unknown> =>
    Promise.resolve(),
  )
  vi.stubGlobal('useRoute', () => route)
  const resolve = vi.fn(
    ({
      query: nextQuery,
      hash,
    }: {
      query: Record<string, unknown>
      hash: string
    }) => {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(nextQuery)) {
        for (const item of Array.isArray(value) ? value : [value]) {
          if (item !== undefined && item !== null)
            params.append(key, String(item))
        }
      }
      return { href: `/ja/jpn/cards${params.size ? `?${params}` : ''}${hash}` }
    },
  )
  vi.stubGlobal('useRouter', () => ({ push, replace, resolve }))
  vi.stubGlobal('window', { location: { origin: 'https://holodori.example' } })

  let result!: ReturnType<typeof useCardListConditions>
  let initialReady = true
  let initialSearch = 'unexpected'
  const component = defineComponent({
    setup() {
      result = useCardListConditions(computed(() => options))
      initialReady = result.ready.value
      initialSearch = result.conditions.value.q
      return () => h('div')
    },
  })
  const root: HostNode = { children: [] }
  const app: App<HostNode> = renderer.createApp(component)
  app.mount(root)
  return {
    app,
    route,
    push,
    replace,
    resolve,
    result,
    initialReady,
    initialSearch,
  }
}

async function settle() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 30))
  await nextTick()
}

afterEach(() => {
  codecControls.decode = undefined
  codecControls.encode = undefined
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useCardListConditions', () => {
  it('starts unready during setup and applies the URL query on mount', async () => {
    const context = mountComposable({
      q: '  Sakura  ',
      rarity: ['5'],
      layout: 'vertical',
    })
    expect(context.initialReady).toBe(false)
    expect(context.initialSearch).toBe('')

    await settle()

    expect(context.result.ready.value).toBe(true)
    expect(context.result.conditions.value).toEqual({
      q: 'Sakura',
      character: [],
      skill: [],
      connect: [],
      rarity: [5],
      attribute: [1, 2, 3],
      specialization: ['performance', 'technique', 'sense'],
      sort: 'order',
      direction: 'desc',
    })
    expect(context.push).not.toHaveBeenCalled()
    expect(context.replace).not.toHaveBeenCalled()
    context.app.unmount()
  })

  it('applies browser back and forward route changes without writing history', async () => {
    const context = mountComposable({ q: 'first' })
    await settle()
    expect(context.result.conditions.value.q).toBe('first')

    context.route.query = { q: 'second', layout: 'vertical' }
    context.route.fullPath = '/ja/jpn/cards?q=second&layout=vertical'
    await settle()
    expect(context.result.conditions.value.q).toBe('second')

    context.route.query = { q: 'first' }
    context.route.fullPath = '/ja/jpn/cards?q=first'
    await settle()
    expect(context.result.conditions.value.q).toBe('first')
    expect(context.push).not.toHaveBeenCalled()
    expect(context.replace).not.toHaveBeenCalled()
    context.app.unmount()
  })

  it('resets conditions and removes a legacy layout query on the next write', async () => {
    const context = mountComposable({
      q: 'saved',
      sort: 'total',
      layout: 'vertical',
      custom: 'keep',
    })
    await settle()

    context.result.reset()

    expect(context.result.conditions.value).toEqual({
      q: '',
      character: [],
      skill: [],
      connect: [],
      rarity: [3, 4, 5],
      attribute: [1, 2, 3],
      specialization: ['performance', 'technique', 'sense'],
      sort: 'order',
      direction: 'desc',
    })
    expect(context.push).toHaveBeenCalledWith({
      query: { custom: 'keep' },
      hash: '',
    })
    context.app.unmount()
  })

  it('debounces search with replace and writes other condition changes with push', async () => {
    vi.useFakeTimers()
    const context = mountComposable()
    await nextTick()
    await Promise.resolve()

    context.result.conditions.value.q = 'a'
    context.result.conditions.value.q = 'ab'
    expect(context.replace).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(250)
    expect(context.replace).toHaveBeenCalledTimes(1)
    expect(context.replace).toHaveBeenCalledWith({
      query: { q: 'ab' },
      hash: '',
    })

    context.result.conditions.value.rarity = [5]
    expect(context.push).toHaveBeenCalledWith({
      query: { q: 'ab', rarity: ['5'] },
      hash: '',
    })
    context.app.unmount()
  })

  it('restores all checkbox options on reset and removes explicit empty selections', async () => {
    const context = mountComposable({
      rarity: '',
      attribute: '',
      specialization: '',
    })
    await settle()
    expect(context.result.conditions.value.rarity).toEqual([])
    expect(context.result.conditions.value.attribute).toEqual([])
    expect(context.result.conditions.value.specialization).toEqual([])

    context.result.reset()

    expect(context.result.conditions.value.rarity).toEqual(options.rarity)
    expect(context.result.conditions.value.attribute).toEqual(options.attribute)
    expect(context.result.conditions.value.specialization).toEqual(
      options.specialization,
    )
    expect(context.push).toHaveBeenCalledWith({ query: {}, hash: '' })
    context.app.unmount()
  })

  it('parses Connect query values and writes Connect changes immediately while preserving hash', async () => {
    const context = mountComposable({
      connect: ['extent-b', 'unknown', 'extent-a', 'extent-b'],
    })
    context.route.hash = '#connect'
    await settle()
    expect(context.result.conditions.value.connect).toEqual([
      'extent-b',
      'extent-a',
    ])

    context.result.conditions.value.connect = ['extent-b', 'extent-a']
    expect(context.push).toHaveBeenCalledWith({
      query: { connect: ['extent-a', 'extent-b'] },
      hash: '#connect',
    })
    context.app.unmount()
  })

  it('does not classify Connect changes as debounced search-only changes', async () => {
    vi.useFakeTimers()
    const context = mountComposable()
    await nextTick()
    await Promise.resolve()

    context.result.conditions.value.q = 'card'
    context.result.conditions.value.connect = ['extent-a']
    expect(context.push).toHaveBeenCalledWith({
      query: { q: 'card', connect: ['extent-a'] },
      hash: '',
    })
    expect(context.replace).not.toHaveBeenCalled()
    context.app.unmount()
  })

  it('cancels a pending search write when unmounted', async () => {
    vi.useFakeTimers()
    const context = mountComposable()
    await nextTick()

    context.result.conditions.value.q = 'pending'
    context.app.unmount()
    await vi.advanceTimersByTimeAsync(250)

    expect(context.replace).not.toHaveBeenCalled()
  })

  it('decodes skill query before becoming ready and applies it with other filters', async () => {
    const encoded = await (
      await import('../shared/game-data/card-skill-query.ts')
    ).encodeCardSkillSelection(['active:a1'])
    const context = mountComposable({ skill: encoded })
    expect(context.result.ready.value).toBe(false)
    await settle()
    expect(context.result.ready.value).toBe(true)
    expect(context.result.conditions.value.skill).toEqual(['active:a1'])
    expect(context.push).not.toHaveBeenCalled()
    context.app.unmount()
  })

  it('keeps readiness false until the newest initial route decode finishes', async () => {
    const deferred: Array<(ids: string[]) => void> = []
    const seen: string[] = []
    codecControls.decode = (value) => {
      seen.push(value)
      return new Promise((resolve) => deferred.push(resolve))
    }
    const context = mountComposable({ skill: 'g1.first', q: 'first' })
    expect(seen).toEqual(['g1.first'])

    context.route.query = { skill: 'g1.second', q: 'second' }
    context.route.fullPath = '/ja/jpn/cards?skill=g1.second&q=second'
    expect(seen).toEqual(['g1.first', 'g1.second'])
    expect(context.result.ready.value).toBe(false)

    deferred[0](['passive:p1'])
    await nextTick()
    expect(context.result.ready.value).toBe(false)
    expect(context.result.conditions.value.q).toBe('')

    deferred[1](['active:a1'])
    await settle()
    expect(context.result.ready.value).toBe(true)
    expect(context.result.conditions.value.q).toBe('second')
    expect(context.result.conditions.value.skill).toEqual(['active:a1'])
    context.app.unmount()
  })

  it('keeps valid non-skill conditions when skill decoding fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const context = mountComposable({ skill: 'g9.invalid', q: 'Sakura' })
    await settle()
    expect(context.result.conditions.value.q).toBe('Sakura')
    expect(context.result.conditions.value.skill).toEqual([])
    expect(context.result.skillQueryError.value).toBe('decode')
    expect(warn).toHaveBeenCalled()
    context.app.unmount()
  })

  it('discards an encoded selection after browser navigation wins the race', async () => {
    const context = mountComposable()
    await settle()
    context.result.conditions.value.skill = ['active:a1']
    context.route.query = { q: 'back' }
    context.route.fullPath = '/ja/jpn/cards?q=back'
    await settle()
    expect(context.result.conditions.value.q).toBe('back')
    expect(context.result.conditions.value.skill).toEqual([])
    expect(context.push).not.toHaveBeenCalled()
    context.app.unmount()
  })

  it('writes only the newest deferred skill encoding', async () => {
    const deferred: Array<(value: string | undefined) => void> = []
    codecControls.encode = () =>
      new Promise((resolve) => deferred.push(resolve))
    const context = mountComposable()
    await settle()
    context.result.conditions.value.skill = ['active:a1']
    context.result.conditions.value.skill = ['passive:p1']
    expect(deferred).toHaveLength(2)
    deferred[1]('g1.newest')
    await settle()
    expect(context.push).toHaveBeenCalledTimes(1)
    expect(context.push).toHaveBeenCalledWith({
      query: { skill: 'g1.newest' },
      hash: '',
    })
    deferred[0]('g1.stale')
    await settle()
    expect(context.push).toHaveBeenCalledTimes(1)
    context.app.unmount()
  })

  it('encodes skill changes before pushing and preserves the hash', async () => {
    const context = mountComposable({ custom: 'keep' })
    context.route.hash = '#section'
    await settle()
    context.result.conditions.value.skill = ['active:a1']
    await settle()
    expect(context.push).toHaveBeenCalledTimes(1)
    const location = context.push.mock.calls[0][0] as {
      query: Record<string, unknown>
      hash: string
    }
    expect(location.hash).toBe('#section')
    expect(location.query.custom).toBe('keep')
    expect(location.query.skill).toMatch(/^g1\./)
    expect(
      await (
        await import('../shared/game-data/card-skill-query.ts')
      ).decodeCardSkillSelection(String(location.query.skill)),
    ).toEqual(['active:a1'])
    context.app.unmount()
  })

  it('keeps the original skill query when gzip is unavailable', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('CompressionStream', undefined)
    const context = mountComposable({ skill: 'g1.raw-value', q: 'before' })
    await nextTick()
    await Promise.resolve()
    expect(context.result.skillQuerySupported.value).toBe(false)
    context.result.conditions.value.q = 'after'
    await vi.advanceTimersByTimeAsync(250)
    expect(context.replace).toHaveBeenCalledWith({
      query: { q: 'after', skill: 'g1.raw-value' },
      hash: '',
    })
    context.app.unmount()
  })

  it('keeps the selection in memory when the resolved URL exceeds 8000 bytes', async () => {
    const context = mountComposable({ custom: 'x'.repeat(8100) })
    await settle()
    context.result.conditions.value.skill = ['active:a1']
    await settle()
    expect(context.result.conditions.value.skill).toEqual(['active:a1'])
    expect(context.result.skillQueryError.value).toBe('length')
    expect(context.push).not.toHaveBeenCalled()
    context.app.unmount()
  })

  it('keeps memory state and reports router write failures', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const context = mountComposable()
    await settle()
    context.push.mockRejectedValueOnce(new Error('navigation failed'))
    context.result.conditions.value.skill = ['active:a1']
    await settle()
    expect(context.result.conditions.value.skill).toEqual(['active:a1'])
    expect(context.result.skillQueryError.value).toBe('encode')
    expect(warn).toHaveBeenCalled()
    context.app.unmount()
  })

  it('reports a resolved Vue Router navigation failure', async () => {
    const realRouter = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/cards', component: { render: () => null } }],
    })
    await realRouter.push('/cards')
    realRouter.beforeEach(() => false)
    const failure = await realRouter.push('/cards?changed=1')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const context = mountComposable()
    await settle()
    context.push.mockResolvedValueOnce(failure)
    context.result.conditions.value.skill = ['active:a1']
    await settle()
    expect(context.result.conditions.value.skill).toEqual(['active:a1'])
    expect(context.result.skillQueryError.value).toBe('encode')
    expect(warn).toHaveBeenCalled()
    context.app.unmount()
  })

  it('treats a duplicate reset navigation as a successful no-op', async () => {
    const realRouter = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/cards', component: { render: () => null } }],
    })
    await realRouter.push('/cards')
    const duplicate = await realRouter.push('/cards')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const context = mountComposable()
    await settle()
    context.push.mockResolvedValueOnce(duplicate)
    context.result.reset()
    await settle()
    expect(context.result.skillQueryError.value).toBeNull()
    expect(warn).not.toHaveBeenCalled()
    context.app.unmount()
  })

  it('does not let an older delayed push commit replace newer conditions', async () => {
    const encoded: Array<(value: string | undefined) => void> = []
    codecControls.encode = () => new Promise((resolve) => encoded.push(resolve))
    let commitOld!: () => void
    const context = mountComposable()
    await settle()
    context.push.mockImplementationOnce((rawLocation) => {
      const location = rawLocation as {
        query: Record<string, unknown>
        hash: string
      }
      return new Promise<void>((resolve) => {
        commitOld = () => {
          context.route.query = location.query
          context.route.hash = location.hash
          context.route.fullPath = context.resolve(location).href
          resolve()
        }
      })
    })

    context.result.conditions.value.skill = ['active:a1']
    encoded[0]('g1.old')
    await settle()
    expect(context.push).toHaveBeenCalledTimes(1)

    context.result.conditions.value.skill = ['passive:p1']
    expect(encoded).toHaveLength(2)
    commitOld()
    await nextTick()
    expect(context.result.conditions.value.skill).toEqual(['passive:p1'])

    encoded[1]('g1.new')
    await settle()
    expect(context.push).toHaveBeenCalledTimes(2)
    expect(context.result.conditions.value.skill).toEqual(['passive:p1'])
    context.app.unmount()
  })

  it('cancels an outstanding encode when unmounted', async () => {
    let resolveEncode!: (value: string | undefined) => void
    codecControls.encode = () =>
      new Promise((resolve) => {
        resolveEncode = resolve
      })
    const context = mountComposable()
    await settle()
    context.result.conditions.value.skill = ['active:a1']
    await nextTick()
    context.app.unmount()
    resolveEncode('g1.stale')
    await settle()
    expect(context.push).not.toHaveBeenCalled()
  })
})
