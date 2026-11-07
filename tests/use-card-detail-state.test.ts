import {
  computed,
  createRenderer,
  defineComponent,
  h,
  nextTick,
  ref,
  type App,
  type Ref,
} from 'vue'
import {
  createMemoryHistory,
  createRouter,
  RouterView,
  useRoute,
} from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CardDetailGrowthData } from '../shared/game-data/cards/detail.ts'
import { useCardDetailState } from '../app/composables/card/useCardDetailState.ts'

type HostNode = { children: HostNode[]; parent?: HostNode }
const renderer = createRenderer<HostNode, HostNode>({
  createElement: () => ({ children: [] }),
  createText: () => ({ children: [] }),
  createComment: () => ({ children: [] }),
  setText: () => {},
  setElementText: () => {},
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
    node.parent.children.splice(node.parent.children.indexOf(node), 1)
    node.parent = undefined
  },
})

const growth: CardDetailGrowthData = {
  weightsPermil: { performance: 400, technique: 300, sense: 300 },
  levels: [
    { level: 1, parameterBaseValue: 1000 },
    { level: 2, parameterBaseValue: 2000 },
  ],
  levelLimits: [
    { limitBreakCount: 0, levelLimit: 1 },
    { limitBreakCount: 1, levelLimit: 2 },
  ],
  potentials: [{ upgradeCount: 1, effectType: 4, value: 100 }],
}

let app: App<HostNode> | undefined
let state: Map<string, Ref<unknown>>
let context: Awaited<ReturnType<typeof mount>>

function mount(reducedMotion = false) {
  state = new Map()
  vi.stubGlobal('useState', <T>(key: string, initial: () => T) => {
    if (!state.has(key)) state.set(key, ref(initial()) as Ref<unknown>)
    return state.get(key) as Ref<T>
  })
  vi.stubGlobal('window', {
    matchMedia: vi.fn(() => ({ matches: reducedMotion })),
  })
  let result!: ReturnType<typeof useCardDetailState>
  const detailView = defineComponent({
    setup() {
      const route = useRoute()
      result = useCardDetailState({
        cardId: computed(() => String(route.params.id ?? '')),
        growth: ref(growth),
        assetType: ref(2),
        siteLocale: computed(() => String(route.params.site)),
        gameLocale: computed(() => String(route.params.game)),
      })
      return () => h('div')
    },
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/ja/jpn/cards/:id', component: detailView },
      { path: '/en/eng/cards/:id', component: detailView },
      { path: '/fr/fra/cards/:id', component: detailView },
      {
        path: '/ja/jpn/cards',
        component: defineComponent(() => () => h('div')),
      },
      {
        path: '/en/eng/cards',
        component: defineComponent(() => () => h('div')),
      },
      {
        path: '/fr/fra/cards',
        component: defineComponent(() => () => h('div')),
      },
    ],
  })
  const root: HostNode = { children: [] }
  app = renderer.createApp({ render: () => h(RouterView) })
  app.use(router)
  return router.push('/ja/jpn/cards/card-a').then(async () => {
    app!.mount(root)
    await router.isReady()
    await nextTick()
    return {
      app: app!,
      router,
      get result() {
        return result
      },
      root,
    }
  })
}

afterEach(() => {
  app?.unmount()
  app = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useCardDetailState', () => {
  it('keeps growth and media across same-card locale changes, and resets for another card', async () => {
    context = await mount()
    context.result.selection.value.level = 1
    context.result.animateCard.value = false
    context.result.fullscreenVisible.value = true
    await nextTick()

    await context.router.push('/en/eng/cards/card-a')
    await nextTick()
    expect(context.result.selection.value.level).toBe(1)
    expect(context.result.animateCard.value).toBe(false)
    expect(context.result.fullscreenVisible.value).toBe(false)

    context.result.fullscreenVisible.value = true
    await context.router.push('/en/eng/cards/card-b')
    await nextTick()
    expect(context.result.selection.value).toEqual({
      level: 2,
      limitBreakCount: 1,
      potentialUpgradeCount: 1,
    })
    expect(context.result.animateCard.value).toBe(true)
    expect(context.result.fullscreenVisible.value).toBe(false)
  })

  it('restores same-card state across a locale remount and clears it after leaving the detail page', async () => {
    context = await mount()
    context.result.selection.value.level = 1
    context.result.showSignature.value = false
    await nextTick()

    await context.router.push('/fr/fra/cards/card-a')
    await nextTick()
    expect(context.result.selection.value.level).toBe(1)
    expect(context.result.showSignature.value).toBe(false)

    await context.router.push('/fr/fra/cards')
    await context.router.push('/ja/jpn/cards/card-a')
    await nextTick()
    expect(context.result.selection.value.level).toBe(2)
    expect(context.result.showSignature.value).toBe(true)

    context.app.unmount()
    const reloaded = await mount()
    expect(reloaded.result.selection.value.level).toBe(2)
    expect(reloaded.result.showSignature.value).toBe(true)
  })

  it('turns off animation for a new card when reduced motion is preferred', async () => {
    context = await mount(true)
    expect(context.result.animateCard.value).toBe(false)
    context.result.animateCard.value = true
    await context.router.push('/en/eng/cards/card-a')
    await nextTick()
    expect(context.result.animateCard.value).toBe(true)

    await context.router.push('/en/eng/cards/card-b')
    await nextTick()
    expect(context.result.animateCard.value).toBe(false)
  })
})
