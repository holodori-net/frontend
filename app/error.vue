<script setup lang="ts">
const { t } = useI18n()
const error = useError()
</script>

<template>
  <main class="entry-page">
    <section class="entry-card error-card">
      <p class="eyebrow">{{ error?.statusCode ?? 404 }}</p>
      <h1>{{ t('notFoundTitle') }}</h1>
      <p class="muted">{{ t('notFoundDescription') }}</p>
      <NuxtLink class="button button-primary" to="/">
        {{ t('backHome') }}
      </NuxtLink>
    </section>
  </main>
</template>
