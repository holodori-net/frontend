<script setup lang="ts">
defineProps<{
  title: string
  levels: { level: number; text: string; lang: string }[]
}>()
</script>

<template>
  <section class="min-w-0">
    <Divider
      align="left"
      role="presentation"
      :aria-orientation="null"
      class="my-2 min-w-0"
      :pt="{ content: { class: 'min-w-0 max-w-full' } }"
    >
      <h3
        class="m-0 min-w-0 max-w-full text-sm font-semibold leading-snug wrap-anywhere"
      >
        {{ title }}
      </h3>
    </Divider>
    <div class="grid min-w-0 gap-y-2">
      <div
        v-for="item in levels"
        :key="item.level"
        class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3"
      >
        <span
          class="whitespace-nowrap text-xs leading-relaxed text-muted-color"
        >
          {{ $t('cardList.skillLevel', { level: item.level }) }}
        </span>
        <p
          class="mb-0 min-w-0 text-sm leading-relaxed wrap-anywhere"
          :lang="item.lang"
        >
          <CardListSkillText :text="item.text" :lang="item.lang" />
        </p>
      </div>
    </div>
  </section>
</template>
