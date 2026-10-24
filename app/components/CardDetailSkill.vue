<script setup lang="ts">
import {
  getCardSkillEffectIconUrl,
  getCardSkillIconUrl,
  getCardSkillLabelIconUrl,
  type CardSkillIconKind,
} from '#shared/game-data/card-icons'

const props = defineProps<{
  kind: CardSkillIconKind
  title: string
  rows: readonly {
    level: number
    effectType: number | null
    text: string
    lang: string
  }[]
  currentLevel: number
}>()
const iconUrl = computed(() => getCardSkillIconUrl(props.kind))
const labelIconUrl = computed(() => getCardSkillLabelIconUrl(props.kind))
const effectIconUrl = computed(() =>
  getCardSkillEffectIconUrl(
    props.kind,
    props.rows.find((row) => row.level === props.currentLevel)?.effectType ??
      null,
  ),
)
const fallbackLabel = computed(
  () =>
    ({
      specialSkill: 'SP',
      activeSkill: 'ACT',
      passiveSkill: 'PAS',
    })[props.kind],
)
const {
  status: iconStatus,
  imageElement: iconImageElement,
  onLoad: onIconLoad,
  onError: onIconError,
} = useImageLoading(iconUrl)
const {
  status: labelStatus,
  imageElement: labelImageElement,
  onLoad: onLabelLoad,
  onError: onLabelError,
} = useImageLoading(labelIconUrl)
const {
  status: effectStatus,
  imageElement: effectImageElement,
  onLoad: onEffectLoad,
  onError: onEffectError,
} = useImageLoading(effectIconUrl)
</script>

<template>
  <section class="flex min-w-0 items-start gap-4 py-4 first:pt-0 last:pb-0">
    <div
      class="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl text-xs font-bold text-muted-color sm:size-[4.5rem]"
    >
      <Skeleton
        v-if="iconUrl && iconStatus === 'loading'"
        class="image-skeleton absolute inset-0 size-full"
        width="100%"
        height="100%"
        border-radius="0"
      />
      <img
        v-if="iconUrl && iconStatus !== 'failed'"
        ref="iconImageElement"
        :key="iconUrl"
        :src="iconUrl"
        alt=""
        aria-hidden="true"
        class="skill-icon-base absolute inset-0 size-full object-contain"
        loading="lazy"
        decoding="async"
        @load="onIconLoad"
        @error="onIconError"
      />
      <img
        v-if="
          effectIconUrl && effectStatus !== 'failed' && iconStatus !== 'failed'
        "
        ref="effectImageElement"
        :key="effectIconUrl"
        :src="effectIconUrl"
        alt=""
        aria-hidden="true"
        class="absolute inset-0 size-full object-contain p-1"
        loading="lazy"
        decoding="async"
        @load="onEffectLoad"
        @error="onEffectError"
      />
      <img
        v-if="
          labelIconUrl && labelStatus !== 'failed' && iconStatus !== 'failed'
        "
        ref="labelImageElement"
        :key="labelIconUrl"
        :src="labelIconUrl"
        alt=""
        aria-hidden="true"
        class="skill-icon-label absolute bottom-1 left-0 z-10 object-contain"
        :class="`skill-icon-label--${kind}`"
        loading="lazy"
        decoding="async"
        @load="onLabelLoad"
        @error="onLabelError"
      />
      <span
        v-if="iconStatus === 'failed' || !iconUrl"
        class="relative z-20"
        aria-hidden="true"
        >{{ fallbackLabel }}</span
      >
    </div>
    <div class="min-w-0 flex-1">
      <div class="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 class="m-0 text-base font-semibold leading-snug">{{ title }}</h2>
      </div>
      <div class="grid gap-2">
        <div
          v-for="item in rows"
          :key="item.level"
          class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3"
          :class="
            item.level === currentLevel
              ? 'text-color'
              : 'text-surface-600 dark:text-surface-300'
          "
          :aria-current="item.level === currentLevel ? 'true' : undefined"
        >
          <span
            class="whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium leading-relaxed"
            :class="
              item.level === currentLevel
                ? 'bg-primary text-primary-contrast'
                : 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-200'
            "
          >
            {{ $t('cardList.skillLevel', { level: item.level }) }}
          </span>
          <p
            class="mb-0 min-w-0 whitespace-pre-line text-sm leading-relaxed wrap-anywhere"
            :lang="item.lang"
          >
            <CardListSkillText :text="item.text" :lang="item.lang" />
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.skill-icon-label {
  left: -0.15rem;
  height: 43%;
}

.skill-icon-label--passiveSkill {
  aspect-ratio: 45 / 52;
}

.skill-icon-label--activeSkill {
  aspect-ratio: 50 / 52;
}

.skill-icon-label--specialSkill {
  aspect-ratio: 70 / 53;
}
</style>
