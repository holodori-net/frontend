import { effectScope, nextTick, ref, type Ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

type Registration = ServiceWorkerRegistration

type TestContext = {
  scope: ReturnType<typeof effectScope>
  route: { path: string }
  siteCookie: Ref<string | null>
  gameCookie: Ref<string | null>
  resolveRegistration: (registration: Registration) => void
  rejectRegistration: (error: Error) => void
  syncOfflinePages: ReturnType<typeof vi.fn>
}

const contexts: TestContext[] = []

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept
    reject = fail
  })
  return { promise, resolve, reject }
}

function createRegistration(): Registration {
  const registration = new EventTarget() as Registration
  Object.assign(registration, {
    installing: null,
    waiting: null,
    update: vi.fn().mockResolvedValue(undefined),
  })
  return registration
}

async function startPlugin(options: { registrationFails?: boolean } = {}) {
  vi.resetModules()
  const registrationPromise = deferred<Registration>()
  const siteCookie = ref<string | null>(null)
  const gameCookie = ref<string | null>(null)
  const route = { path: '/ja/jpn' }
  const afterEach = vi.fn()
  const syncOfflinePages = vi.fn().mockResolvedValue({ success: true })

  vi.doMock('#shared/language', () => import('../shared/language'))
  vi.doMock('~/composables/useOfflinePages', () => ({
    getOfflinePages: vi.fn(() => ['home']),
    syncOfflinePages,
  }))

  vi.stubGlobal('defineNuxtPlugin', (setup: () => void) => setup)
  vi.stubGlobal('useRouter', () => ({
    currentRoute: { value: route },
    afterEach,
    isReady: () => Promise.resolve(),
  }))
  vi.stubGlobal('useCookie', (name: string) =>
    name === 'holodori-site-locale' ? siteCookie : gameCookie,
  )
  vi.stubGlobal('refreshCookie', vi.fn())
  vi.stubGlobal('navigator', {
    onLine: true,
    serviceWorker: {
      controller: null,
      register: options.registrationFails
        ? vi.fn().mockRejectedValue(new Error('registration failed'))
        : vi.fn(() => registrationPromise.promise),
      addEventListener: vi.fn(),
    },
  })
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    clearTimeout: vi.fn(),
    setTimeout: vi.fn(() => 1),
    location: { reload: vi.fn() },
  })

  const module = await import('../app/plugins/pwa.client')
  const plugin = module.default as unknown as () => void
  const scope = effectScope()
  scope.run(plugin)

  const context: TestContext = {
    scope,
    route,
    siteCookie,
    gameCookie,
    resolveRegistration: registrationPromise.resolve,
    rejectRegistration: registrationPromise.reject,
    syncOfflinePages,
  }
  contexts.push(context)
  return context
}

async function settle() {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
}

afterEach(() => {
  for (const context of contexts.splice(0)) context.scope.stop()
  vi.doUnmock('~/composables/useOfflinePages')
  vi.doUnmock('#shared/language')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('generic PWA client synchronization', () => {
  it('waits for service worker registration before syncing', async () => {
    const context = await startPlugin()
    await settle()
    expect(context.syncOfflinePages).not.toHaveBeenCalled()

    context.resolveRegistration(createRegistration())
    await vi.waitFor(() => {
      expect(context.syncOfflinePages).toHaveBeenCalledTimes(1)
    })
    expect(context.syncOfflinePages.mock.calls[0]?.[0]).toEqual({
      siteLocale: 'ja',
      gameLocale: 'jpn',
      pages: ['home'],
    })
  })

  it('skips a conflicting cookie and syncs after the cookie changes without navigation', async () => {
    const context = await startPlugin()
    context.siteCookie.value = 'en'
    context.resolveRegistration(createRegistration())
    await settle()
    expect(context.syncOfflinePages).not.toHaveBeenCalled()

    context.siteCookie.value = 'ja'
    await nextTick()
    await settle()
    expect(context.route.path).toBe('/ja/jpn')
    await vi.waitFor(() => {
      expect(context.syncOfflinePages).toHaveBeenCalledTimes(1)
    })
    expect(context.syncOfflinePages.mock.calls[0]?.[0]).toEqual({
      siteLocale: 'ja',
      gameLocale: 'jpn',
      pages: ['home'],
    })
  })

  it('does not sync when service worker registration fails', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const context = await startPlugin({ registrationFails: true })
    await vi.waitFor(() => {
      expect(warning).toHaveBeenCalledWith(
        'Holodori service worker registration failed',
        expect.any(Error),
      )
    })
    expect(context.syncOfflinePages).not.toHaveBeenCalled()
  })
})
