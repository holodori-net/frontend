<script setup lang="ts">
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const { t } = useI18n()
const installPrompt = ref<InstallPromptEvent | null>(null)
const isIos = ref(false)
const isInstalled = ref(false)

onMounted(() => {
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

async function install() {
  if (!installPrompt.value) return
  await installPrompt.value.prompt()
  await installPrompt.value.userChoice
  installPrompt.value = null
}
</script>

<template>
  <aside v-if="!isInstalled && (installPrompt || isIos)" class="pwa-notice">
    <div
      v-if="installPrompt"
      class="flex items-center justify-between gap-4 rounded-2xl border border-surface-200 bg-surface-0 p-4 text-sm shadow-lg dark:border-surface-700 dark:bg-surface-900"
    >
      <span>{{ t('pwaInstallDescription') }}</span>
      <Button :label="t('pwaInstall')" severity="secondary" @click="install" />
    </div>
    <p v-else-if="isIos" class="pwa-install-help">
      {{ t('pwaIosInstallHelp') }}
    </p>
  </aside>
</template>
