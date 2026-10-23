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
import type { SongFilterOptions } from '../shared/game-data/song-list.ts'
import { useSongListConditions } from '../app/composables/useSongListConditions.ts'

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
  nextSibling: (node) =>
    node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
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

const options: SongFilterOptions = {
  character: ['chr-a', 'chr-b'],
  category: [1, 2],
  singerType: [1, 2],
  difficulty: [1, 2, 3, 4],
}

function mountComposable(query: Record<string, unknown> = {}) {
  const route = reactive({ fullPath: '/ja/jpn/songs', query, hash: '' })
  const push = vi.fn((..._args: unknown[]) => Promise.resolve())
  const replace = vi.fn((..._args: unknown[]) => Promise.resolve())
  const resolve = vi.fn(
    ({
      query: next,
      hash,
    }: {
      query: Record<string, unknown>
      hash: string
    }) => {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(next)) {
        for (const item of Array.isArray(value) ? value : [value]) {
          if (item !== undefined && item !== null)
            params.append(key, String(item))
        }
      }
      return { href: `/ja/jpn/songs${params.size ? `?${params}` : ''}${hash}` }
    },
  )
  vi.stubGlobal('useRoute', () => route)
  vi.stubGlobal('useRouter', () => ({ push, replace, resolve }))
  let result!: ReturnType<typeof useSongListConditions>
  let initialReady = true
  const component = defineComponent({
    setup() {
      result = useSongListConditions(computed(() => options))
      initialReady = result.ready.value
      return () => h('div')
    },
  })
  const root: HostNode = { children: [] }
  const app: App<HostNode> = renderer.createApp(component)
  app.mount(root)
  return { app, route, push, replace, result, initialReady }
}

async function settle() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 30))
  await nextTick()
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useSongListConditions', () => {
  it('starts unready and parses query after mount without rewriting it', async () => {
    const context = mountComposable({
      q: '  Sakura ',
      difficulty: ['2'],
      category: '',
      custom: 'keep',
    })
    expect(context.initialReady).toBe(false)
    await settle()
    expect(context.result.ready.value).toBe(true)
    expect(context.result.conditions.value).toMatchObject({
      q: 'Sakura',
      difficulty: [2],
      category: [],
    })
    expect(context.push).not.toHaveBeenCalled()
    expect(context.replace).not.toHaveBeenCalled()
    context.app.unmount()
  })

  it('applies browser history changes without writing history', async () => {
    const context = mountComposable({ q: 'first' })
    await settle()
    context.route.query = { q: 'second', category: ['2'] }
    context.route.fullPath = '/ja/jpn/songs?q=second&category=2'
    await settle()
    expect(context.result.conditions.value.q).toBe('second')
    expect(context.result.conditions.value.category).toEqual([2])
    expect(context.push).not.toHaveBeenCalled()
    context.app.unmount()
  })

  it('debounces search with replace and pushes other changes immediately', async () => {
    vi.useFakeTimers()
    const context = mountComposable()
    await nextTick()
    await Promise.resolve()
    context.result.conditions.value.q = 'a'
    context.result.conditions.value.q = 'ab'
    expect(context.replace).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(250)
    expect(context.replace).toHaveBeenCalledWith({
      query: { q: 'ab' },
      hash: '',
    })
    context.result.conditions.value.category = [2]
    expect(context.push).toHaveBeenCalledWith({
      query: { q: 'ab', category: ['2'] },
      hash: '',
    })
    context.app.unmount()
  })

  it('reset preserves unrelated query values and the hash', async () => {
    const context = mountComposable({ q: 'search', custom: 'keep' })
    context.route.hash = '#songs'
    await settle()
    context.result.reset()
    expect(context.push).toHaveBeenCalledWith({
      query: { custom: 'keep' },
      hash: '#songs',
    })
    context.app.unmount()
  })

  it('retains memory conditions and exposes queryError when navigation fails', async () => {
    const context = mountComposable()
    await settle()
    context.push.mockRejectedValueOnce(new Error('blocked'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    context.result.conditions.value.category = [2]
    await settle()
    expect(context.result.conditions.value.category).toEqual([2])
    expect(context.result.queryError.value).toBe('write')
    expect(warn).toHaveBeenCalled()
    context.app.unmount()
  })
})
