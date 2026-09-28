<script setup lang="ts">
import { isGameLocale } from '#shared/language'

const { t } = useI18n()
definePageMeta({
  validate: (pageRoute) => isGameLocale(String(pageRoute.params.gameLocale)),
})
</script>

<template>
  <div class="site-shell">
    <SiteHeader />
    <main class="page-content">
      <div class="page-heading">
        <p class="eyebrow">DATABASE</p>
        <h1>{{ t('cards') }}</h1>
      </div>
      <section class="empty-state" aria-labelledby="empty-title">
        <div class="empty-icon" aria-hidden="true">✦</div>
        <h2 id="empty-title">{{ t('emptyTitle') }}</h2>
        <p>{{ t('emptyDescription') }}</p>
      </section>
    </main>
  </div>
</template>
