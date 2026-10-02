import {
  getOfflinePages,
  syncOfflinePages,
} from '~/composables/useOfflinePages'
import { isGameLocale, isSiteLocale } from '#shared/language'
import { nextTick, watch } from 'vue'

export default defineNuxtPlugin(() => {
  const router = useRouter()
  const preferredSiteLocale = useCookie<string | null>('holodori-site-locale', {
    default: () => null,
    readonly: true,
  })
  const preferredGameLocale = useCookie<string | null>('holodori-game-locale', {
    default: () => null,
    readonly: true,
  })
  let registration: ServiceWorkerRegistration | undefined
  let entryCheckActive = true
  let updateAccepted = false
  let reloadStarted = false
  let currentSelectionKey = ''
  let syncingSelectionKey = ''

  function currentSelection(path: string) {
    const [, siteValue, gameValue] = path.split('/')
    if (!siteValue || !gameValue) return null
    if (!isSiteLocale(siteValue) || !isGameLocale(gameValue)) return null
    return { siteLocale: siteValue, gameLocale: gameValue }
  }

  async function synchronizeCurrentLocale(path: string) {
    await registrationReady
    if (!registration) return
    const selected = currentSelection(path)
    if (!selected) return
    const key = `${selected.siteLocale}:${selected.gameLocale}`
    await nextTick()
    refreshCookie('holodori-site-locale')
    refreshCookie('holodori-game-locale')
    if (key === currentSelectionKey || key === syncingSelectionKey) return
    if (
      (preferredSiteLocale.value &&
        preferredSiteLocale.value !== selected.siteLocale) ||
      (preferredGameLocale.value &&
        preferredGameLocale.value !== selected.gameLocale)
    ) {
      return
    }

    if (!navigator.onLine) return
    syncingSelectionKey = key
    try {
      const result = await syncOfflinePages({
        ...selected,
        pages: getOfflinePages(selected.siteLocale, selected.gameLocale),
      })
      if (result.success) currentSelectionKey = key
      else console.warn('Holodori offline page sync failed', result.error)
    } finally {
      syncingSelectionKey = ''
    }
  }

  async function checkForWaitingWorker() {
    const hadController = Boolean(navigator.serviceWorker.controller)
    registration = await navigator.serviceWorker.register('/sw.js', {
      type: 'module',
    })

    const activateWaitingWorker = () => {
      if (!hadController || !registration?.waiting || updateAccepted) return
      updateAccepted = true
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }

    const watchedWorkers = new Map<ServiceWorker, () => void>()
    const watchInstallingWorker = (worker: ServiceWorker | null) => {
      if (!worker) return
      if (watchedWorkers.has(worker)) return
      const onStateChange = () => {
        if (entryCheckActive && worker.state === 'installed') {
          activateWaitingWorker()
        }
      }
      watchedWorkers.set(worker, onStateChange)
      worker.addEventListener('statechange', onStateChange)
      onStateChange()
    }

    const waitForInstallingWorker = (worker: ServiceWorker) =>
      new Promise<void>((resolve) => {
        if (worker.state !== 'installing') {
          resolve()
          return
        }

        const finish = (timedOut = false) => {
          if (!timedOut && worker.state === 'installing') return
          window.clearTimeout(timeout)
          worker.removeEventListener('statechange', onStateChange)
          resolve()
        }
        const onStateChange = () => finish()
        const timeout = window.setTimeout(() => finish(true), 5_000)
        worker.addEventListener('statechange', onStateChange)
      })

    const onUpdateFound = () => {
      if (entryCheckActive)
        watchInstallingWorker(registration?.installing ?? null)
    }
    registration.addEventListener('updatefound', onUpdateFound)
    watchInstallingWorker(registration.installing)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (updateAccepted && !reloadStarted) {
        reloadStarted = true
        window.location.reload()
      }
    })
    activateWaitingWorker()

    try {
      await registration.update()
      const installingWorker = registration.installing
      if (installingWorker) await waitForInstallingWorker(installingWorker)
      activateWaitingWorker()
    } finally {
      entryCheckActive = false
      registration.removeEventListener('updatefound', onUpdateFound)
      for (const [worker, listener] of watchedWorkers) {
        worker.removeEventListener('statechange', listener)
      }
    }
  }

  const registrationReady = checkForWaitingWorker().catch((error: unknown) => {
    console.warn('Holodori service worker registration failed', error)
  })

  watch([preferredSiteLocale, preferredGameLocale], () => {
    void synchronizeCurrentLocale(router.currentRoute.value.path).catch(
      (error: unknown) => {
        console.warn('Holodori offline page sync failed', error)
      },
    )
  })

  router.afterEach((to) => {
    void synchronizeCurrentLocale(to.path).catch((error: unknown) => {
      console.warn('Holodori offline page sync failed', error)
    })
  })
  void router
    .isReady()
    .then(() => synchronizeCurrentLocale(router.currentRoute.value.path))
    .catch((error: unknown) => {
      console.warn('Holodori offline page sync failed', error)
    })
  window.addEventListener('online', () => {
    currentSelectionKey = ''
    void synchronizeCurrentLocale(router.currentRoute.value.path).catch(
      (error: unknown) => {
        console.warn('Holodori offline page sync failed', error)
      },
    )
  })
  window.addEventListener('holodori-language-confirmed', () => {
    void synchronizeCurrentLocale(router.currentRoute.value.path).catch(
      (error: unknown) => {
        console.warn('Holodori offline page sync failed', error)
      },
    )
  })
})
