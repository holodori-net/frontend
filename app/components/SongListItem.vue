<script setup lang="ts">
import { resolveLocalizedName, type GameLocale } from '#shared/language'
import type {
  SongListItemData,
  SongListPayload,
  SongOptionalText,
} from '#shared/game-data/songs'
import {
  getSongImageUrl,
  type SongListField,
} from '#shared/game-data/song-list'
import { useImageLoading } from '~/composables/useImageLoading'

const props = defineProps<{
  song: SongListItemData
  payload: SongListPayload
  fields: readonly SongListField[]
  chartDifficulties: readonly number[]
  gameLocale: GameLocale
}>()
const { t, locale } = useI18n()
const imageUrl = computed(() => getSongImageUrl(props.song.jacketAssetId))
const { status, imageElement, onLoad, onError } = useImageLoading(imageUrl)
const title = computed(() =>
  resolveLocalizedName(props.song.title, props.gameLocale),
)
const localized = (value: Record<string, string | null> | null) => {
  if (!value) return ''
  return value[props.gameLocale] || value.jpn || value.eng || ''
}
const formatDate = (value: string | null) => {
  if (!value) return '—'
  const timestamp = Number(value)
  const date = new Date(timestamp)
  return Number.isFinite(timestamp) && !Number.isNaN(date.getTime())
    ? `${new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeZone: 'Asia/Tokyo' }).format(date)} ${new Intl.DateTimeFormat(locale.value, { timeStyle: 'short', timeZone: 'Asia/Tokyo' }).format(date)} JST`
    : '—'
}
const categories = computed(() => props.song.categoryType)
const chartOrder = computed(() =>
  [...props.song.difficulties]
    .filter((chart) => props.chartDifficulties.includes(chart.type))
    .sort((a, b) => a.type - b.type),
)
const credits = computed<[string, SongOptionalText | null][]>(() => [
  ['lyricist', props.song.lyricist],
  ['composer', props.song.composer],
  ['arranger', props.song.arranger],
])
const rankRows = (id: string) => props.payload.scoreRankGroups[id] ?? []
const comboRows = (id: string) => props.payload.comboGroups[id] ?? []
const conditionText = (id: string | null) => {
  if (!id) return t('songList.noCondition')
  const conditions = props.payload.conditions[id] ?? []
  const texts = conditions
    .flatMap((item) => [
      localized(item.description),
      localized(item.detailDescription),
    ])
    .filter(Boolean)
  if (!texts.length) return t('songList.noConditionText')
  const operator = conditions.find(
    (item) => item.operatorType !== null,
  )?.operatorType
  const connective = t(
    operator === 2 ? 'songList.conditionOr' : 'songList.conditionAnd',
  )
  return [...new Set(texts)].join(` ${connective} `)
}
const releaseType = computed(() =>
  t(`songList.releaseType.${props.song.releaseType}`),
)
const ranks = (rows: ReturnType<typeof rankRows>) =>
  rows.map((row) => ({
    ...row,
    name: `${['D', 'C', 'B', 'A', 'S'][row.rankType - 1] ?? '—'}${row.plus ? `+${row.plus}` : ''}`,
  }))
function percent(value: number | null) {
  return value === null ? '—' : `${(value / 10).toLocaleString(locale.value)}%`
}
function externalUrl(value: string | null) {
  return value && /^https?:\/\//i.test(value) ? value : null
}
</script>

<template>
  <li class="min-w-0">
    <article
      class="overflow-hidden rounded-xl border border-surface-200 bg-surface-0 shadow-sm dark:border-surface-700 dark:bg-surface-900"
      :aria-labelledby="`song-title-${song.id}`"
    >
      <div
        class="relative aspect-square overflow-hidden bg-surface-100 dark:bg-surface-800"
      >
        <Skeleton
          v-if="status === 'loading'"
          class="absolute inset-0 !h-full !w-full !rounded-none"
          aria-hidden="true"
        />
        <div
          v-if="status === 'failed'"
          class="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted-color"
        >
          {{ t('songList.imageUnavailable') }}
        </div>
        <img
          ref="imageElement"
          :src="imageUrl"
          :alt="title.text"
          :lang="title.lang"
          class="size-full object-cover"
          :class="status !== 'loaded' && 'invisible'"
          loading="lazy"
          decoding="async"
          @load="onLoad"
          @error="onError"
        />
      </div>
      <h2
        v-if="!fields.includes('title')"
        :id="`song-title-${song.id}`"
        class="sr-only"
        :lang="title.lang"
      >
        {{ title.text }}
      </h2>
      <div v-if="fields.length" class="space-y-4 p-4">
        <template v-for="field in fields" :key="field">
          <section v-if="field === 'title'" class="song-field break-words">
            <h2
              :id="`song-title-${song.id}`"
              class="text-lg font-bold"
              :lang="title.lang"
            >
              {{ title.text }}
            </h2>
          </section>
          <section
            v-else-if="field === 'singer'"
            class="song-field break-words"
          >
            <h3>{{ t('songList.field.singer') }}</h3>
            <p>
              {{
                localized(song.singerName) ||
                song.characterIds
                  .map(
                    (id) =>
                      payload.characters.find(
                        (character) => character.id === id,
                      )?.name[gameLocale] ||
                      payload.characters.find(
                        (character) => character.id === id,
                      )?.name.jpn,
                  )
                  .filter(Boolean)
                  .join(' / ') ||
                '—'
              }}
            </p>
          </section>
          <section
            v-else-if="field === 'category'"
            class="song-field break-words"
          >
            <h3>{{ t('songList.field.category') }}</h3>
            <p>
              {{ t(`songList.category.${categories}`, String(categories)) }} ·
              {{
                t(
                  `songList.singerType.${song.musicSingerType}`,
                  String(song.musicSingerType),
                )
              }}
            </p>
          </section>
          <section
            v-else-if="field === 'duration'"
            class="song-field break-words"
          >
            <h3>{{ t('songList.field.duration') }}</h3>
            <p>
              {{ Math.floor(song.playingSeconds / 60) }}:{{
                String(song.playingSeconds % 60).padStart(2, '0')
              }}
            </p>
          </section>
          <section
            v-else-if="field === 'charts'"
            class="song-field break-words"
          >
            <h3>{{ t('songList.field.charts') }}</h3>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="chart in chartOrder"
                :key="chart.type"
                class="rounded-md bg-surface-100 px-2 py-1 text-sm dark:bg-surface-800"
              >
                <span class="font-medium">{{
                  t(`songList.difficulty.${chart.type}`, String(chart.type))
                }}</span
                ><span class="ml-1">{{ chart.level }}</span
                ><span class="ml-2 text-muted-color"
                  >{{ chart.fullComboNoteCount }}
                  {{ t('songList.notes') }}</span
                >
                <p class="mt-1 text-xs text-muted-color">
                  {{
                    t('songList.comboReward', {
                      count: chart.maxComboCountRewardThreshold,
                    })
                  }}
                </p>
                <p class="text-xs text-muted-color">
                  {{ conditionText(chart.unlockConditionGroupId) }}
                </p>
              </div>
            </div>
          </section>
          <section
            v-else-if="field === 'credits'"
            class="song-field break-words"
          >
            <h3>{{ t('songList.field.credits') }}</h3>
            <dl class="space-y-1 text-sm">
              <div
                v-for="entry in credits"
                :key="entry[0]"
                class="flex flex-wrap gap-x-2"
              >
                <dt class="text-muted-color">
                  {{ t(`songList.${entry[0]}`) }}
                </dt>
                <dd>{{ localized(entry[1]) || '—' }}</dd>
              </div>
            </dl>
          </section>
          <section
            v-else-if="field === 'availability'"
            class="song-field break-words"
          >
            <h3>{{ t('songList.field.availability') }}</h3>
            <p>{{ formatDate(song.startTime) }}</p>
            <p v-if="localized(song.subtitle)" class="text-sm">
              {{ localized(song.subtitle) }}
            </p>
            <p
              v-if="localized(song.description)"
              class="whitespace-pre-line text-sm text-muted-color"
            >
              {{ localized(song.description) }}
            </p>
            <p
              v-if="
                song.chorusStartMillisecond !== null &&
                song.chorusEndMillisecond !== null
              "
              class="text-xs text-muted-color"
            >
              {{
                t('songList.chorus', {
                  start: (song.chorusStartMillisecond / 1000).toFixed(1),
                  end: (song.chorusEndMillisecond / 1000).toFixed(1),
                })
              }}
            </p>
          </section>
          <section
            v-else-if="field === 'unlock'"
            class="song-field break-words"
          >
            <h3>{{ t('songList.field.unlock') }}</h3>
            <p>
              {{
                t('songList.releaseSummary', {
                  type: releaseType,
                  quantity: song.requiredReleaseItemQuantity ?? '—',
                })
              }}
            </p>
            <p v-if="localized(song.lockDescription)">
              {{ localized(song.lockDescription) }}
            </p>
          </section>
          <section
            v-else-if="field === 'scoring'"
            class="song-field break-words"
          >
            <h3>{{ t('songList.field.scoring') }}</h3>
            <p>
              {{ t('songList.coefficient') }}:
              {{ percent(song.scoreCoefficientPermil) }} ·
              {{
                song.isHighestScoreRatingTarget === null
                  ? '—'
                  : song.isHighestScoreRatingTarget
                    ? t('songList.ratingTarget')
                    : t('songList.notRatingTarget')
              }}
            </p>
            <div class="grid gap-3 sm:grid-cols-2">
              <div
                v-for="(rows, label) in {
                  single: ranks(rankRows(song.singleScoreRankGroupId)),
                  multi: ranks(rankRows(song.multiScoreRankGroupId)),
                }"
                :key="label"
                class="overflow-x-auto"
                role="region"
                :aria-label="t(`songList.${label}Score`)"
                tabindex="0"
              >
                <table class="w-full text-left text-xs">
                  <caption class="pb-1 text-left font-semibold">
                    {{
                      t(`songList.${label}Score`)
                    }}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{{ t('songList.rankHeader') }}</th>
                      <th scope="col">{{ t('songList.scoreHeader') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in rows"
                      :key="`${row.rankType}-${row.plus}`"
                    >
                      <th scope="row">{{ row.name }}</th>
                      <td>{{ row.score ?? '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div
              class="overflow-x-auto"
              role="region"
              :aria-label="t('songList.comboScores')"
              tabindex="0"
            >
              <table class="w-full text-left text-xs">
                <caption class="pb-1 text-left font-semibold">
                  {{
                    t('songList.comboScores')
                  }}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{{ t('songList.comboHeader') }}</th>
                    <th scope="col">{{ t('songList.scoreUpHeader') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in comboRows(song.comboGroupId)"
                    :key="row.countFrom"
                  >
                    <th scope="row">{{ row.countFrom }}</th>
                    <td>{{ percent(row.scoreUpPermil) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section
            v-else-if="field === 'musicVideos'"
            class="song-field break-words"
          >
            <h3>{{ t('songList.field.musicVideos') }}</h3>
            <div v-if="externalUrl(song.mvUrl)" class="mb-2">
              <a
                :href="externalUrl(song.mvUrl)!"
                target="_blank"
                rel="noopener noreferrer"
                >{{ t('songList.officialVideo') }}</a
              >
            </div>
            <div
              v-for="video in song.musicVideos"
              :key="video.number"
              class="mb-2 text-sm"
            >
              <p class="font-medium">
                {{
                  localized(video.name) ||
                  t('songList.musicVideo', { number: video.number })
                }}
              </p>
              <p v-if="localized(video.description)" class="text-muted-color">
                {{ localized(video.description) }}
              </p>
              <p class="text-xs text-muted-color">
                {{
                  payload.mvCategories[video.categoryId]?.label[gameLocale] ||
                  payload.mvCategories[video.categoryId]?.label.jpn ||
                  t('songList.otherCategory')
                }}
                · {{ conditionText(video.conditionGroupId) }}
              </p>
            </div>
            <p v-if="!song.musicVideos.length && !song.mvUrl">—</p>
          </section>
          <section
            v-else-if="field === 'copyright'"
            class="song-field break-words"
          >
            <h3>{{ t('songList.field.copyright') }}</h3>
            <p>{{ song.copyright || '—' }}</p>
          </section>
        </template>
      </div>
    </article>
  </li>
</template>

<style scoped>
.song-field {
  min-width: 0;
}
.song-field h3 {
  margin-bottom: 0.4rem;
  border-bottom: 1px solid var(--p-surface-200);
  padding-bottom: 0.35rem;
  font-size: 0.875rem;
  font-weight: 700;
}
:global(.dark) .song-field h3 {
  border-color: var(--p-surface-700);
}
.song-field p {
  margin-top: 0.15rem;
}
</style>
