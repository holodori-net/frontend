<script setup lang="ts">
import { NuxtLink } from '#components'
const { t } = useI18n()
const error = useError()
</script>

<template>
  <main class="grid min-h-screen place-items-center p-6">
    <section
      class="w-full max-w-xl rounded-3xl border border-surface-200 bg-surface-0 p-8 text-center shadow-xl dark:border-surface-700 dark:bg-surface-900 sm:p-11"
    >
      <p class="mb-3 text-xs font-bold tracking-[0.14em] text-primary">
        {{ error?.statusCode ?? 404 }}
      </p>
      <h1 class="mb-3 text-3xl font-bold">{{ t('notFoundTitle') }}</h1>
      <p class="mb-0 leading-relaxed text-muted-color">
        {{ t('notFoundDescription') }}
      </p>
      <Button :as="NuxtLink" class="mt-6" to="/" :label="t('backHome')" />
    </section>
  </main>
</template>
