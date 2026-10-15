import {
  computed,
  createRenderer,
  defineComponent,
  h,
  nextTick,
  reactive,
  type App,
} from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CardFilterOptions } from '../shared/game-data/card-list.ts'
import { useCardListConditions } from '../app/composables/useCardListConditions.ts'

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
  rarity: [3, 4, 5],
  attribute: [1, 2, 3],
  specialization: ['performance', 'technique', 'sense'],
}

function mountComposable(query: Record<string, unknown> = {}) {
  const route = reactive({ fullPath: '/ja/jpn/cards', query, hash: '' })
  const push = vi.fn(() => Promise.resolve())
  const replace = vi.fn(() => Promise.resolve())
  vi.stubGlobal('useRoute', () => route)
  vi.stubGlobal('useRouter', () => ({ push, replace }))

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
  return { app, route, push, replace, result, initialReady, initialSearch }
}

afterEach(() => {
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

    await nextTick()

    expect(context.result.ready.value).toBe(true)
    expect(context.result.conditions.value).toEqual({
      q: 'Sakura',
      character: [],
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
    expect(context.result.conditions.value.q).toBe('first')

    context.route.query = { q: 'second', layout: 'vertical' }
    context.route.fullPath = '/ja/jpn/cards?q=second&layout=vertical'
    await nextTick()
    expect(context.result.conditions.value.q).toBe('second')

    context.route.query = { q: 'first' }
    context.route.fullPath = '/ja/jpn/cards?q=first'
    await nextTick()
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
    await nextTick()

    context.result.reset()

    expect(context.result.conditions.value).toEqual({
      q: '',
      character: [],
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
    await nextTick()
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

  it('cancels a pending search write when unmounted', async () => {
    vi.useFakeTimers()
    const context = mountComposable()
    await nextTick()

    context.result.conditions.value.q = 'pending'
    context.app.unmount()
    await vi.advanceTimersByTimeAsync(250)

    expect(context.replace).not.toHaveBeenCalled()
  })
})
