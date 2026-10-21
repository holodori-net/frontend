<script setup lang="ts">
import { X } from '@lucide/vue'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const { t } = useI18n()
const INSTALL_DISMISSED_STORAGE_KEY = 'holodori-pwa-install-dismissed'
const installPrompt = ref<InstallPromptEvent | null>(null)
const isIos = ref(false)
const isInstalled = ref(false)
const isInstallDismissed = ref(false)

onMounted(() => {
  try {
    isInstallDismissed.value =
      localStorage.getItem(INSTALL_DISMISSED_STORAGE_KEY) === 'true'
  } catch (error) {
    console.warn(
      'Unable to read PWA install dismissal preference from localStorage.',
      error,
    )
  }

  const userAgent = navigator.userAgent.toLowerCase()
  isIos.value = /iphone|ipad|ipod/.test(userAgent)
  isInstalled.value =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true

  window.addEventListener('beforeinstallprompt', onInstallPrompt)
  window.addEventListener('appinstalled', () => {
    isInstalled.value = true
    installPrompt.value = null
  })
})

function onInstallPrompt(event: Event) {
  event.preventDefault()
  installPrompt.value = event as InstallPromptEvent
}

function dismissInstall() {
  isInstallDismissed.value = true
  try {
    localStorage.setItem(INSTALL_DISMISSED_STORAGE_KEY, 'true')
  } catch (error) {
    console.warn(
      'Unable to save PWA install dismissal preference to localStorage.',
      error,
    )
  }
}

async function install() {
  if (!installPrompt.value) return
  await installPrompt.value.prompt()
  await installPrompt.value.userChoice
  installPrompt.value = null
}
</script>

<template>
  <aside
    v-if="!isInstalled && !isInstallDismissed && (installPrompt || isIos)"
    class="pwa-notice"
  >
    <div class="pwa-install-help">
      <p class="m-0 min-w-0">
        {{ t(installPrompt ? 'pwaInstallDescription' : 'pwaIosInstallHelp') }}
      </p>
      <Button
        class="!size-11 !shrink-0 !p-0"
        :aria-label="t('pwaDismissInstall')"
        :title="t('pwaDismissInstall')"
        severity="secondary"
        text
        @click="dismissInstall"
      >
        <X
          aria-hidden="true"
          :size="20"
          :stroke-width="2"
          color="currentColor"
        />
      </Button>
      <Button
        v-if="installPrompt"
        class="pwa-install-action"
        :label="t('pwaInstall')"
        severity="secondary"
        @click="install"
      />
    </div>
  </aside>
</template>
