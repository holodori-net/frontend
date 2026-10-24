<script setup lang="ts">
import { getCardMovieUrl } from '#shared/game-data/card-icons'

const props = defineProps<{
  assetId: string | null
  variant: 'full_0' | 'full_1'
}>()
const animate = defineModel<boolean>('animate', { required: true })
const showSignature = defineModel<boolean>('showSignature', { required: true })

const mounted = ref(false)
const cardVideo = ref<HTMLVideoElement | null>(null)
const signatureVideo = ref<HTMLVideoElement | null>(null)
const signatureReady = ref(false)
const signatureVisible = ref(false)
const cardReady = ref(false)
const cardUrl = computed(() => getCardMovieUrl(props.assetId, props.variant))
const signatureUrl = computed(() => getCardMovieUrl(props.assetId, 'sign'))
const generation = ref(0)
let disposed = false
let frameHandle: number | null = null
let signPlayPending = false

function warnFailure(kind: 'card' | 'signature', error: unknown) {
  console.warn('[card-detail-media] Video unavailable', {
    assetId: props.assetId,
    kind,
    error,
  })
  if (kind === 'card') animate.value = false
  else showSignature.value = false
}

function cancelFrameSync() {
  const card = cardVideo.value
  if (frameHandle !== null && card?.cancelVideoFrameCallback)
    card.cancelVideoFrameCallback(frameHandle)
  frameHandle = null
}

function scheduleFrameSync(card: HTMLVideoElement) {
  if (frameHandle !== null || card.paused || document.hidden) return
  if (card.requestVideoFrameCallback) {
    frameHandle = card.requestVideoFrameCallback(() => {
      frameHandle = null
      syncSignature()
    })
  }
}

function setSignatureTime(video: HTMLVideoElement, time: number) {
  if (Math.abs(video.currentTime - time) < 0.08) return
  signatureReady.value = false
  try {
    video.currentTime = time
  } catch (error) {
    warnFailure('signature', error)
  }
}

function syncSignature() {
  const card = cardVideo.value
  const sign = signatureVideo.value
  if (
    !mounted.value ||
    !animate.value ||
    !showSignature.value ||
    !card ||
    !sign
  ) {
    signatureVisible.value = false
    cancelFrameSync()
    return
  }

  cardReady.value = card.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
  if (
    card.readyState < HTMLMediaElement.HAVE_METADATA ||
    sign.readyState < HTMLMediaElement.HAVE_METADATA ||
    !Number.isFinite(card.duration) ||
    !Number.isFinite(sign.duration)
  ) {
    signatureVisible.value = false
    scheduleFrameSync(card)
    return
  }

  const delay = Math.max(0, card.duration - sign.duration)
  if (card.currentTime < delay) {
    signatureVisible.value = false
    if (!sign.paused) sign.pause()
    signPlayPending = false
    setSignatureTime(sign, 0)
    scheduleFrameSync(card)
    return
  }

  const target = Math.max(0, Math.min(sign.duration, card.currentTime - delay))
  setSignatureTime(sign, target)
  signatureReady.value =
    sign.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    Math.abs(sign.currentTime - target) < 0.08
  signatureVisible.value = signatureReady.value

  if (sign.paused && !signPlayPending) {
    signPlayPending = true
    const currentGeneration = generation.value
    const currentSign = sign
    void sign
      .play()
      .catch((error: unknown) => {
        if (
          !disposed &&
          currentGeneration === generation.value &&
          currentSign === signatureVideo.value &&
          (error as DOMException)?.name !== 'AbortError'
        )
          warnFailure('signature', error)
      })
      .finally(() => {
        if (currentGeneration === generation.value) signPlayPending = false
      })
  }
  scheduleFrameSync(card)
}

function showStaticSignature() {
  cancelFrameSync()
  const sign = signatureVideo.value
  signatureVisible.value = false
  signatureReady.value = false
  if (!mounted.value || !showSignature.value || !sign) return
  sign.pause()
  if (
    sign.readyState < HTMLMediaElement.HAVE_METADATA ||
    !Number.isFinite(sign.duration)
  )
    return
  // The game pauses the autograph sequence at 8 seconds for its complete signature frame.
  const target = Math.min(8, Math.max(0, sign.duration - 0.04))
  setSignatureTime(sign, target)
  if (
    sign.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    Math.abs(sign.currentTime - target) < 0.08
  ) {
    signatureReady.value = true
    signatureVisible.value = true
  }
}

function startCardVideo(reset = true) {
  const card = cardVideo.value
  if (
    !mounted.value ||
    !animate.value ||
    !cardUrl.value ||
    !card ||
    document.hidden
  )
    return
  const currentGeneration = generation.value
  const currentCard = card
  if (reset && card.readyState >= HTMLMediaElement.HAVE_METADATA) {
    try {
      card.currentTime = 0
    } catch (error) {
      warnFailure('card', error)
      return
    }
  }
  void card
    .play()
    .then(() => {
      if (
        !disposed &&
        currentGeneration === generation.value &&
        currentCard === cardVideo.value
      )
        syncSignature()
    })
    .catch((error: unknown) => {
      if (
        !disposed &&
        currentGeneration === generation.value &&
        currentCard === cardVideo.value &&
        (error as DOMException)?.name !== 'AbortError'
      )
        warnFailure('card', error)
    })
}

function onCardData() {
  cardReady.value = true
  syncSignature()
}

function onCardMetadata() {
  syncSignature()
}

function onSignatureData() {
  if (animate.value) syncSignature()
  else showStaticSignature()
}

function onMediaEvent() {
  if (animate.value) syncSignature()
  else showStaticSignature()
}

function onVideoError(kind: 'card' | 'signature', event: Event) {
  const video = event.currentTarget as HTMLVideoElement | null
  if (video !== (kind === 'card' ? cardVideo.value : signatureVideo.value))
    return
  warnFailure(kind, video?.error ?? event)
}

function stopVideos() {
  generation.value += 1
  cancelFrameSync()
  cardVideo.value?.pause()
  signatureVideo.value?.pause()
  signPlayPending = false
}

function onVisibilityChange() {
  if (document.hidden) stopVideos()
  else if (animate.value) startCardVideo(false)
  else showStaticSignature()
}

watch(
  [cardUrl, signatureUrl, () => props.variant],
  async () => {
    stopVideos()
    signatureReady.value = false
    signatureVisible.value = false
    cardReady.value = false
    await nextTick()
    if (animate.value) startCardVideo(true)
    else showStaticSignature()
  },
  { flush: 'post' },
)

watch(animate, async (enabled) => {
  stopVideos()
  if (enabled) {
    await nextTick()
    startCardVideo(true)
  } else {
    cardReady.value = false
    showStaticSignature()
  }
})

watch(showSignature, async (visible) => {
  if (!visible) {
    signatureVisible.value = false
    signatureReady.value = false
    signatureVideo.value?.pause()
    return
  }
  await nextTick()
  if (animate.value) syncSignature()
  else showStaticSignature()
})

onMounted(async () => {
  mounted.value = true
  document.addEventListener('visibilitychange', onVisibilityChange)
  await nextTick()
  if (animate.value) startCardVideo(true)
  else showStaticSignature()
})

onBeforeUnmount(() => {
  disposed = true
  document.removeEventListener('visibilitychange', onVisibilityChange)
  stopVideos()
})
</script>

<template>
  <div
    class="card-detail-media pointer-events-none absolute inset-0 overflow-hidden"
    aria-hidden="true"
  >
    <video
      v-if="mounted && animate && cardUrl"
      ref="cardVideo"
      :key="cardUrl"
      :src="cardUrl"
      class="absolute inset-0 size-full object-contain"
      :class="cardReady ? 'opacity-100' : 'opacity-0'"
      muted
      playsinline
      loop
      preload="metadata"
      @loadedmetadata="onCardMetadata"
      @loadeddata="onCardData"
      @timeupdate="syncSignature"
      @play="syncSignature"
      @ended="syncSignature"
      @error="onVideoError('card', $event)"
    />
    <video
      v-if="mounted && signatureUrl && showSignature"
      ref="signatureVideo"
      :key="signatureUrl"
      :src="signatureUrl"
      class="absolute inset-0 size-full object-contain"
      :class="signatureVisible ? 'opacity-100' : 'opacity-0'"
      muted
      playsinline
      preload="metadata"
      @loadedmetadata="onMediaEvent"
      @loadeddata="onSignatureData"
      @seeked="onMediaEvent"
      @timeupdate="onMediaEvent"
      @ended="onMediaEvent"
      @error="onVideoError('signature', $event)"
    />
  </div>
</template>
