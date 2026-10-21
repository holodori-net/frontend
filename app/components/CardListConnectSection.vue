<script setup lang="ts">
import type { CardListConnectEffectLevelData } from '#shared/game-data/card-list-data'
import type { ConnectPosition } from '#shared/game-data/skill-tree-connect-effects'
import { gameLocaleLanguages, type GameLocale } from '#shared/language'

const props = defineProps<{
  title: string
  gameLocale: GameLocale
  levels: readonly CardListConnectEffectLevelData[]
  positions: readonly ConnectPosition[]
}>()

const levels = computed(() =>
  [...props.levels]
    .sort((a, b) => a.level - b.level)
    .map((effect) => ({
      level: effect.level,
      text: effect.description[props.gameLocale].replace(
        /\[\/?highlight\]/g,
        '',
      ),
      lang: gameLocaleLanguages[props.gameLocale],
    })),
)
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
    <div class="flex min-w-0 flex-wrap items-start gap-3">
      <CardListConnectGraph :positions="positions" />
      <div class="grid min-w-48 flex-1 gap-y-2">
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
    </div>
  </section>
</template>
