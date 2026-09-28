<script setup lang="ts">
import { isGameLocale } from '#shared/language'

const { t } = useI18n()
definePageMeta({
  validate: (pageRoute) => isGameLocale(String(pageRoute.params.gameLocale)),
})
</script>

<template>
  <div class="min-h-screen">
    <SiteHeader />
    <main class="mx-auto w-[min(100%-3rem,67.5rem)] py-9 pb-24 sm:py-16">
      <div class="mb-8">
        <p class="mb-2 text-xs font-bold tracking-[0.14em] text-primary">
          HOLODORI DATABASE
        </p>
        <h1 class="mb-0 text-3xl font-bold sm:text-4xl">{{ t('cards') }}</h1>
      </div>
      <Card aria-labelledby="empty-title" class="min-h-80 text-center">
        <template #content>
          <div
            class="grid min-h-72 content-center justify-items-center px-5 py-8"
          >
            <div
              class="mb-5 grid size-14 place-items-center rounded-2xl bg-primary/10 text-2xl text-primary"
              aria-hidden="true"
            >
              ✿
            </div>
            <h2 id="empty-title" class="mb-2 text-xl font-semibold">
              {{ t('emptyTitle') }}
            </h2>
            <p class="mb-0 max-w-lg leading-relaxed text-muted-color">
              {{ t('emptyDescription') }}
            </p>
          </div>
        </template>
      </Card>
    </main>
  </div>
</template>
