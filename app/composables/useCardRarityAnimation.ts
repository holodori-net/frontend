import type { Ref } from 'vue'
import { cardRaritySpriteSheetUrl } from '#shared/game-data/card-icons'
import { cardRarityFramePolygons } from '#shared/game-data/card-rarity-animation'

const frameSize = 200
const frameCount = 64
const frameRate = 60

type CanvasSubscriber = {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  onAnimationChange: (active: boolean) => void
  visible: boolean
  lastFrame: number
}

type AnimationManager = ReturnType<typeof createAnimationManager>

const managers = new WeakMap<object, AnimationManager>()

function createAnimationManager(app: object) {
  const subscribers = new Set<CanvasSubscriber>()
  const image = new Image()
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let imageState: 'idle' | 'loading' | 'ready' | 'failed' = 'idle'
  let frame = 0
  let elapsed = 0
  let lastTick: number | undefined
  let requestId: number | undefined

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const subscriber = [...subscribers].find(
        (item) => item.canvas === entry.target,
      )
      if (!subscriber) continue
      subscriber.visible = entry.isIntersecting
      updateSubscriber(subscriber)
    }
    updateClock()
  })

  function canAnimate() {
    return !motionQuery.matches && !document.hidden && imageState === 'ready'
  }

  function draw(subscriber: CanvasSubscriber) {
    const context = subscriber.context
    const { width, height } = subscriber.canvas

    const column = frame % 8
    const row = Math.floor(frame / 8)
    const polygon = cardRarityFramePolygons[frame]!

    context.clearRect(0, 0, width, height)
    context.save()
    context.scale(width / frameSize, height / frameSize)
    context.beginPath()
    polygon.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })
    context.closePath()
    context.clip()
    context.drawImage(
      image,
      column * frameSize,
      row * frameSize,
      frameSize,
      frameSize,
      0,
      0,
      frameSize,
      frameSize,
    )
    context.restore()
    subscriber.lastFrame = frame
  }

  function updateSubscriber(subscriber: CanvasSubscriber) {
    const active = subscriber.visible && canAnimate()
    subscriber.onAnimationChange(active)
    if (active && subscriber.lastFrame !== frame) draw(subscriber)
  }

  function tick(timestamp: number) {
    requestId = undefined
    if (!hasVisibleSubscribers() || !canAnimate()) return

    if (lastTick !== undefined) elapsed += timestamp - lastTick
    lastTick = timestamp
    const nextFrame = Math.floor((elapsed * frameRate) / 1000) % frameCount
    if (nextFrame !== frame) {
      frame = nextFrame
      for (const subscriber of subscribers) {
        if (subscriber.visible) draw(subscriber)
      }
    }
    requestId = window.requestAnimationFrame(tick)
  }

  function hasVisibleSubscribers() {
    return [...subscribers].some((subscriber) => subscriber.visible)
  }

  function updateClock() {
    const shouldLoad =
      hasVisibleSubscribers() && !motionQuery.matches && !document.hidden

    if (shouldLoad) {
      if (imageState === 'idle') {
        imageState = 'loading'
        image.src = cardRaritySpriteSheetUrl
      }
      if (imageState === 'ready' && requestId === undefined) {
        lastTick = undefined
        requestId = window.requestAnimationFrame(tick)
      }
      return
    }

    if (requestId !== undefined) window.cancelAnimationFrame(requestId)
    requestId = undefined
    lastTick = undefined
  }

  image.onload = () => {
    imageState = 'ready'
    for (const subscriber of subscribers) updateSubscriber(subscriber)
    updateClock()
  }
  image.onerror = () => {
    imageState = 'failed'
    for (const subscriber of subscribers) {
      subscriber.onAnimationChange(false)
    }
    updateClock()
  }

  const onEnvironmentChange = () => {
    for (const subscriber of subscribers) updateSubscriber(subscriber)
    updateClock()
  }
  motionQuery.addEventListener('change', onEnvironmentChange)
  document.addEventListener('visibilitychange', onEnvironmentChange)

  function subscribe(
    canvas: HTMLCanvasElement,
    onAnimationChange: CanvasSubscriber['onAnimationChange'],
  ) {
    const pixelSize = Math.ceil(28 * window.devicePixelRatio)
    canvas.width = pixelSize
    canvas.height = pixelSize
    const context = canvas.getContext('2d')
    if (!context) return () => {}

    const subscriber: CanvasSubscriber = {
      canvas,
      context,
      onAnimationChange,
      visible: false,
      lastFrame: -1,
    }
    subscribers.add(subscriber)
    observer.observe(canvas)

    return () => {
      observer.unobserve(canvas)
      subscribers.delete(subscriber)
      subscriber.onAnimationChange(false)
      updateClock()
      if (subscribers.size === 0) {
        observer.disconnect()
        motionQuery.removeEventListener('change', onEnvironmentChange)
        document.removeEventListener('visibilitychange', onEnvironmentChange)
        if (requestId !== undefined) window.cancelAnimationFrame(requestId)
        image.onload = null
        image.onerror = null
        managers.delete(app)
      }
    }
  }

  return { subscribe }
}

export function useCardRarityAnimation(
  canvases: Ref<HTMLCanvasElement[]>,
  onAnimationChange: (index: number, active: boolean) => void,
) {
  const cleanups = new Map<
    HTMLCanvasElement,
    { cleanup: () => void; index: number }
  >()
  let nuxtApp: ReturnType<typeof useNuxtApp> | undefined

  function syncSubscriptions() {
    if (!nuxtApp) return
    const currentCanvases = new Set(canvases.value)

    for (const [canvas, subscription] of cleanups) {
      const index = canvases.value.indexOf(canvas)
      if (index === -1 || index !== subscription.index) {
        subscription.cleanup()
        onAnimationChange(subscription.index, false)
        cleanups.delete(canvas)
      }
    }

    const canvasesWithContext = [...currentCanvases].filter(
      (canvas) => canvas.getContext('2d') !== null,
    )
    if (!canvasesWithContext.length) return
    let manager = managers.get(nuxtApp)
    if (!manager) {
      manager = createAnimationManager(nuxtApp)
      managers.set(nuxtApp, manager)
    }

    for (const canvas of canvasesWithContext) {
      if (cleanups.has(canvas)) continue
      const index = canvases.value.indexOf(canvas)
      const cleanup = manager.subscribe(canvas, (active) => {
        const index = canvases.value.indexOf(canvas)
        if (index !== -1) onAnimationChange(index, active)
      })
      cleanups.set(canvas, { cleanup, index })
    }
  }

  onMounted(() => {
    if (!('IntersectionObserver' in window)) return
    nuxtApp = useNuxtApp()
    syncSubscriptions()
  })

  watch(() => [...canvases.value], syncSubscriptions, { flush: 'post' })

  onBeforeUnmount(() => {
    for (const subscription of cleanups.values()) subscription.cleanup()
    cleanups.clear()
  })
}
