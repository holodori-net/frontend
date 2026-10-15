import type { Ref } from 'vue'
import { nextTick, watch } from 'vue'
import { cardRaritySpriteSheetUrl } from '#shared/game-data/card-icons'
import {
  cardRarityAnimationDuration,
  cardRarityAnimationName,
} from '#shared/game-data/card-rarity-animation'
import { createCardRaritySpriteAtlas } from '~/utils/card-rarity-sprite'

type Subscriber = {
  element: HTMLElement
  onSpriteSheetChange: (spriteSheetUrl: string | undefined) => void
  visible: boolean
  active: boolean
}

type AnimationManager = ReturnType<typeof createAnimationManager>

const managers = new WeakMap<object, AnimationManager>()

function createAnimationManager(app: object) {
  const subscribers = new Map<HTMLElement, Subscriber>()
  const image = new Image()
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let imageState: 'idle' | 'loading' | 'preparing' | 'ready' | 'failed' = 'idle'
  let spriteSheetUrl: string | undefined
  let pendingSpriteSheetUrl: string | undefined
  let elapsed = 0
  let startedAt: number | undefined
  let disposed = false

  function timelineNow(): number {
    return Number(document.timeline.currentTime ?? performance.now())
  }

  function shouldPlay(): boolean {
    return imageState === 'ready' && !motionQuery.matches && !document.hidden
  }

  function hasVisibleSubscriber(): boolean {
    for (const subscriber of subscribers.values()) {
      if (subscriber.visible) return true
    }
    return false
  }

  function phase(): number {
    const currentElapsed =
      elapsed + (startedAt === undefined ? 0 : timelineNow() - startedAt)
    return currentElapsed % (cardRarityAnimationDuration * 1000)
  }

  function synchronizeAnimation(subscriber: Subscriber): void {
    const element = subscriber.element
    void nextTick().then(() => {
      if (
        subscribers.get(element) !== subscriber ||
        !subscriber.active ||
        !element.isConnected
      ) {
        return
      }

      const sharedStartTime = timelineNow() - phase()
      for (const sprite of element.querySelectorAll('.card-rarity-sprite')) {
        for (const animation of sprite.getAnimations()) {
          if (
            'animationName' in animation &&
            (animation as CSSAnimation).animationName ===
              cardRarityAnimationName
          ) {
            animation.startTime = sharedStartTime
          }
        }
      }
    })
  }

  function setActive(subscriber: Subscriber, active: boolean): void {
    if (subscriber.active === active) return
    subscriber.active = active
    subscriber.onSpriteSheetChange(active ? spriteSheetUrl : undefined)
    if (active) synchronizeAnimation(subscriber)
  }

  function refresh(): void {
    if (disposed) return

    const shouldLoad =
      hasVisibleSubscriber() && !motionQuery.matches && !document.hidden

    if (shouldLoad && imageState === 'idle') {
      imageState = 'loading'
      image.crossOrigin = 'anonymous'
      image.src = cardRaritySpriteSheetUrl
    }

    const shouldRun = shouldPlay() && hasVisibleSubscriber()
    if (shouldRun && startedAt === undefined) startedAt = timelineNow()
    if (!shouldRun && startedAt !== undefined) {
      elapsed += timelineNow() - startedAt
      startedAt = undefined
    }

    for (const subscriber of subscribers.values()) {
      setActive(subscriber, subscriber.visible && shouldPlay())
    }
  }

  const observer = new IntersectionObserver((entries) => {
    if (disposed) return
    for (const entry of entries) {
      const subscriber = subscribers.get(entry.target as HTMLElement)
      if (subscriber) subscriber.visible = entry.isIntersecting
    }
    refresh()
  })

  image.onload = async () => {
    imageState = 'preparing'
    try {
      const blob = await createCardRaritySpriteAtlas(image)
      if (disposed || subscribers.size === 0) return

      const preparedUrl = URL.createObjectURL(blob)
      pendingSpriteSheetUrl = preparedUrl
      const preparedImage = new Image()
      preparedImage.src = preparedUrl
      await preparedImage.decode()

      if (disposed || subscribers.size === 0) {
        URL.revokeObjectURL(preparedUrl)
        pendingSpriteSheetUrl = undefined
        return
      }

      pendingSpriteSheetUrl = undefined
      spriteSheetUrl = preparedUrl
      imageState = 'ready'
      refresh()
    } catch (error) {
      if (pendingSpriteSheetUrl) {
        URL.revokeObjectURL(pendingSpriteSheetUrl)
        pendingSpriteSheetUrl = undefined
      }
      if (disposed) return
      imageState = 'failed'
      console.warn(
        '[CardListRarity] Unable to prepare the animated sprite atlas; using the static frame.',
        error,
      )
      refresh()
    }
  }
  image.onerror = (event) => {
    if (disposed) return
    imageState = 'failed'
    console.warn(
      '[CardListRarity] Unable to load the animated sprite sheet; using the static frame.',
      event,
    )
    refresh()
  }

  const onEnvironmentChange = () => refresh()
  motionQuery.addEventListener('change', onEnvironmentChange)
  document.addEventListener('visibilitychange', onEnvironmentChange)

  function subscribe(
    element: HTMLElement,
    onSpriteSheetChange: Subscriber['onSpriteSheetChange'],
  ): () => void {
    const subscriber: Subscriber = {
      element,
      onSpriteSheetChange,
      visible: false,
      active: false,
    }
    subscribers.set(element, subscriber)
    observer.observe(element)

    return () => {
      observer.unobserve(element)
      subscribers.delete(element)
      setActive(subscriber, false)
      refresh()
      if (subscribers.size === 0) {
        disposed = true
        observer.disconnect()
        motionQuery.removeEventListener('change', onEnvironmentChange)
        document.removeEventListener('visibilitychange', onEnvironmentChange)
        image.onload = null
        image.onerror = null
        image.removeAttribute('src')
        managers.delete(app)

        const urlToRevoke = spriteSheetUrl
        const pendingUrlToRevoke = pendingSpriteSheetUrl
        spriteSheetUrl = undefined
        pendingSpriteSheetUrl = undefined
        if (pendingUrlToRevoke) URL.revokeObjectURL(pendingUrlToRevoke)
        if (urlToRevoke) {
          void nextTick().then(() => URL.revokeObjectURL(urlToRevoke))
        }
      }
    }
  }

  return { subscribe }
}

export function useCardRarityAnimation(
  rootElement: Ref<HTMLElement | null>,
  onSpriteSheetChange: (spriteSheetUrl: string | undefined) => void,
): void {
  let nuxtApp: ReturnType<typeof useNuxtApp> | undefined
  let cleanup: (() => void) | undefined

  function syncSubscription(): void {
    cleanup?.()
    cleanup = undefined
    const element = rootElement.value
    if (!nuxtApp || !element || !('IntersectionObserver' in window)) return

    let manager = managers.get(nuxtApp)
    if (!manager) {
      manager = createAnimationManager(nuxtApp)
      managers.set(nuxtApp, manager)
    }
    cleanup = manager.subscribe(element, onSpriteSheetChange)
  }

  onMounted(() => {
    nuxtApp = useNuxtApp()
    syncSubscription()
  })

  watch(rootElement, syncSubscription, { flush: 'post' })

  onBeforeUnmount(() => {
    cleanup?.()
    cleanup = undefined
  })
}
