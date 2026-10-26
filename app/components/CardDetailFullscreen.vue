<script setup lang="ts">
import { RotateCcw, Volume2, VolumeX, X } from '@lucide/vue'
import { onBeforeRouteLeave } from 'vue-router'
import { getCardImageUrl } from '#shared/game-data/card-list'
import { getCardVoiceUrl } from '#shared/game-data/card-icons'

const props = defineProps<{
  assetId: string | null
  voiceAssetId: string | null
  animated: boolean
  variant: 'full_0' | 'full_1'
  cardName: { text: string; lang: string }
  characterId: string
  characterAssetId: string | null
}>()

const visible = defineModel<boolean>('visible', { required: true })
const animate = defineModel<boolean>('animate', { required: true })
const showSignature = defineModel<boolean>('showSignature', { required: true })
const { t } = useI18n()

const artworkUrl = computed(() =>
  getCardImageUrl(props.assetId, 'full', 'original'),
)
const voiceUrl = computed(() => getCardVoiceUrl(props.voiceAssetId))
const {
  status: imageStatus,
  imageElement,
  onLoad,
  onError,
} = useImageLoading(artworkUrl)
const audioElement = ref<HTMLAudioElement | null>(null)
const voiceStatus = ref<'idle' | 'playing' | 'failed'>('idle')
const muted = ref(false)
const dialogId = useId()
const fullscreenPending = ref(false)
let ownsNativeFullscreen = false
let disposed = false
let openGeneration = 0
let voiceAttempt = 0
let loggedVoiceFailureAttempt = -1
let resumeVoiceOnVisible = false

function failVoiceAttempt(attempt: number, error: unknown) {
  if (attempt !== voiceAttempt || !visible.value) return
  voiceStatus.value = 'failed'
  if (loggedVoiceFailureAttempt === attempt) return
  loggedVoiceFailureAttempt = attempt
  console.warn('[card-detail-fullscreen] Voice playback failed', {
    assetId: props.voiceAssetId,
    cardName: props.cardName.text,
    error,
  })
}

function playVoice(restart = true) {
  const audio = audioElement.value
  if (!audio || !voiceUrl.value) return

  const attempt = ++voiceAttempt
  voiceStatus.value = 'idle'
  if (audio.error) audio.load()
  audio.muted = muted.value
  try {
    if (restart) audio.currentTime = 0
  } catch {
    // The source may not have loaded metadata yet; play() can still start it.
  }

  const generation = openGeneration
  let playback: Promise<void>
  try {
    // Keep play() in the user gesture call stack for browser activation rules.
    playback = audio.play()
  } catch (error) {
    failVoiceAttempt(attempt, error)
    return
  }

  void playback
    .then(() => {
      if (
        generation === openGeneration &&
        visible.value &&
        attempt === voiceAttempt &&
        voiceStatus.value !== 'failed'
      )
        voiceStatus.value = 'playing'
    })
    .catch((error: unknown) => {
      if (
        generation !== openGeneration ||
        (error as DOMException)?.name === 'AbortError'
      )
        return
      failVoiceAttempt(attempt, error)
    })
}

function onVoiceError(event: Event) {
  const audio = event.currentTarget as HTMLAudioElement
  if (audio.error) failVoiceAttempt(voiceAttempt, audio.error)
}

function exitOwnedFullscreen() {
  const root = document.documentElement
  if (
    ownsNativeFullscreen &&
    document.fullscreenElement === root &&
    document.exitFullscreen
  ) {
    ownsNativeFullscreen = false
    void document.exitFullscreen().catch((error: unknown) => {
      console.warn('[card-detail-fullscreen] Could not exit fullscreen', error)
    })
  }
}

function open() {
  openGeneration += 1
  visible.value = true
  voiceStatus.value = 'idle'
  playVoice()

  const root = document.documentElement
  if (
    document.fullscreenElement ||
    fullscreenPending.value ||
    !root.requestFullscreen
  )
    return

  fullscreenPending.value = true
  let request: Promise<void>
  try {
    // Request fullscreen synchronously while the opener still has activation.
    request = root.requestFullscreen()
  } catch {
    fullscreenPending.value = false
    return
  }

  void request
    .then(() => {
      fullscreenPending.value = false
      if (document.fullscreenElement !== root) return
      ownsNativeFullscreen = true
      if (disposed || !visible.value) exitOwnedFullscreen()
    })
    .catch(() => {
      fullscreenPending.value = false
      // PrimeVue's viewport-sized modal remains available as the fallback.
    })
}

function close() {
  visible.value = false
}

function stopVoice() {
  resumeVoiceOnVisible = false
  openGeneration += 1
  voiceAttempt += 1
  const audio = audioElement.value
  audio?.pause()
  if (audio) {
    try {
      audio.currentTime = 0
    } catch {
      // A not-yet-loaded voice has no seekable position.
    }
  }
  voiceStatus.value = 'idle'
  exitOwnedFullscreen()
}

function pauseVoice() {
  openGeneration += 1
  voiceAttempt += 1
  const audio = audioElement.value
  resumeVoiceOnVisible = Boolean(
    visible.value && audio && !audio.paused && !audio.ended,
  )
  audio?.pause()
  voiceStatus.value = 'idle'
}

function toggleMuted() {
  muted.value = !muted.value
  if (audioElement.value) audioElement.value.muted = muted.value
}

function onFullscreenChange() {
  const root = document.documentElement
  if (document.fullscreenElement === root && fullscreenPending.value) {
    ownsNativeFullscreen = true
    if (!visible.value) exitOwnedFullscreen()
    return
  }
  if (ownsNativeFullscreen && document.fullscreenElement !== root) {
    ownsNativeFullscreen = false
    if (visible.value) visible.value = false
  }
}

function onVisibilityChange() {
  if (document.hidden) pauseVoice()
  else if (resumeVoiceOnVisible && visible.value) {
    resumeVoiceOnVisible = false
    playVoice(false)
  }
}

watch(visible, (isVisible) => {
  if (!isVisible) stopVoice()
})

watch(
  () => [
    props.assetId,
    props.voiceAssetId,
    props.variant,
    props.cardName.text,
    props.cardName.lang,
  ],
  () => {
    if (visible.value) close()
  },
)

const route = useRoute()
watch(
  () => route.fullPath,
  () => {
    if (visible.value) close()
  },
)
onBeforeRouteLeave(close)

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  disposed = true
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  stopVoice()
})

defineExpose({ open })

const dialogPt = {
  root: { id: dialogId, class: 'card-detail-fullscreen-dialog' },
  header: { class: '!hidden' },
  content: { class: '!flex min-h-0 flex-1 flex-col !overflow-hidden !p-0' },
}
</script>

<template>
  <audio
    v-if="voiceUrl"
    ref="audioElement"
    :src="voiceUrl"
    preload="none"
    @error="onVoiceError"
  />
  <Dialog
    v-model:visible="visible"
    modal
    :closable="false"
    :show-header="false"
    :close-on-escape="true"
    :draggable="false"
    :style="{
      width: '100vw',
      maxWidth: '100vw',
      height: '100dvh',
      maxHeight: '100dvh',
      margin: 0,
    }"
    :pt="dialogPt"
    :aria-labelledby="`${dialogId}-title`"
  >
    <div
      class="relative flex min-h-0 flex-1 flex-col bg-black text-white"
      @click="close"
    >
      <h2 :id="`${dialogId}-title`" class="sr-only">
        {{ props.cardName.text }} · {{ t('cardDetail.fullscreen') }}
      </h2>
      <div
        class="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 sm:p-4"
      >
        <div
          class="relative aspect-video max-h-full w-full max-w-full overflow-hidden"
        >
          <img
            v-if="artworkUrl"
            ref="imageElement"
            :src="artworkUrl"
            :alt="props.cardName.text"
            :lang="props.cardName.lang"
            class="absolute inset-0 size-full object-contain"
            :class="imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'"
            @load="onLoad"
            @error="onError"
          />
          <div
            v-if="imageStatus === 'loading'"
            class="absolute inset-0 animate-pulse bg-white/10 motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div
            v-if="!artworkUrl || imageStatus === 'failed'"
            class="absolute inset-0 flex items-center justify-center bg-white/5 p-4 text-center text-sm text-white/80"
            role="img"
            :aria-label="t('cardList.imageUnavailable')"
          >
            {{ t('cardList.imageUnavailable') }}
          </div>
          <CardDetailMedia
            v-if="visible && props.animated"
            v-model:animate="animate"
            v-model:show-signature="showSignature"
            :asset-id="props.assetId"
            :variant="props.variant"
          />
        </div>
      </div>

      <div
        class="flex shrink-0 flex-wrap items-center justify-center gap-2 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] sm:gap-3 sm:px-4"
      >
        <CardDetailMediaSwitch
          v-if="props.animated"
          v-model="animate"
          :label="t('cardDetail.animateCard')"
          :character-id="props.characterId"
          :character-asset-id="props.characterAssetId"
          class="!text-white"
          @click.stop
        />
        <CardDetailMediaSwitch
          v-if="props.animated"
          v-model="showSignature"
          :label="t('cardDetail.showSignature')"
          :character-id="props.characterId"
          :character-asset-id="props.characterAssetId"
          class="!text-white"
          @click.stop
        />
      </div>

      <div
        class="absolute inset-x-2 top-2 flex items-center justify-between gap-2 sm:inset-x-4 sm:top-4"
      >
        <div class="flex min-w-0 items-center gap-2">
          <template v-if="voiceUrl">
            <Button
              type="button"
              severity="secondary"
              text
              rounded
              class="card-detail-fullscreen-control !size-11 !shrink-0 !text-white"
              :aria-label="t('cardDetail.replayVoice')"
              :title="t('cardDetail.replayVoice')"
              @click.stop="playVoice()"
            >
              <RotateCcw
                :size="20"
                :stroke-width="2"
                color="currentColor"
                aria-hidden="true"
              />
            </Button>
            <Button
              type="button"
              severity="secondary"
              text
              rounded
              class="card-detail-fullscreen-control !size-11 !shrink-0 !text-white"
              :aria-label="
                t(muted ? 'cardDetail.unmuteVoice' : 'cardDetail.muteVoice')
              "
              :title="
                t(muted ? 'cardDetail.unmuteVoice' : 'cardDetail.muteVoice')
              "
              :aria-pressed="muted"
              @click.stop="toggleMuted"
            >
              <VolumeX
                v-if="muted"
                :size="20"
                :stroke-width="2"
                color="currentColor"
                aria-hidden="true"
              />
              <Volume2
                v-else
                :size="20"
                :stroke-width="2"
                color="currentColor"
                aria-hidden="true"
              />
            </Button>
          </template>
          <span
            v-if="voiceStatus === 'failed'"
            class="max-w-48 text-xs text-white/80"
            role="status"
          >
            {{ t('cardDetail.voiceUnavailable') }}
          </span>
        </div>
        <Button
          type="button"
          severity="secondary"
          text
          rounded
          class="card-detail-fullscreen-control !size-11 !shrink-0 !text-white"
          :aria-label="t('cardDetail.closeFullscreen')"
          :title="t('cardDetail.closeFullscreen')"
          @click="close"
        >
          <X
            :size="20"
            :stroke-width="2"
            color="currentColor"
            aria-hidden="true"
          />
        </Button>
      </div>
    </div>
  </Dialog>
</template>

<style>
.card-detail-fullscreen-dialog {
  margin: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: #000 !important;
  color: #fff !important;
}

.card-detail-fullscreen-dialog .p-dialog-content {
  background: #000;
}

.card-detail-fullscreen-dialog .card-detail-fullscreen-control {
  color: #fff !important;
  background: rgb(0 0 0 / 65%);
}

.card-detail-fullscreen-dialog .card-detail-fullscreen-control:hover,
.card-detail-fullscreen-dialog .card-detail-fullscreen-control:active {
  color: #fff !important;
  background: rgb(0 0 0 / 80%) !important;
}

.card-detail-fullscreen-dialog .card-detail-fullscreen-control:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 3px;
  box-shadow: none;
}
</style>
