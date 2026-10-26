<script setup lang="ts">
import { ChevronDown, Disc3 } from '@lucide/vue'
import { resolveLocalizedName, type GameLocale } from '#shared/language'
import type { SongListItemData, SongListPayload } from '#shared/game-data/songs'
import {
  getSongImageUrl,
  getSongUnlockType,
  hasSongMv,
  hasSongLive,
  type SongListField,
} from '#shared/game-data/song-list'
import { getCharacterIconUrl } from '#shared/game-data/character-list'
import { SONG_DIFFICULTY_COLORS } from '#shared/game-data/song-difficulty'
import { SONG_CATEGORY_COLORS } from '#shared/game-data/song-category'
import { useImageLoading } from '~/composables/useImageLoading'

const props = defineProps<{
  song: SongListItemData
  payload: SongListPayload
  fields: readonly SongListField[]
  gameLocale: GameLocale
}>()
const { t, locale } = useI18n()
const imageUrl = computed(() => getSongImageUrl(props.song.jacketAssetId))
const { status, imageElement, onLoad, onError } = useImageLoading(imageUrl)
const title = computed(() =>
  resolveLocalizedName(props.song.title, props.gameLocale),
)
const hasField = (field: SongListField) => props.fields.includes(field)
const localized = (value: Record<string, string | null> | null) =>
  value?.[props.gameLocale] || value?.jpn || value?.eng || ''
const subtitle = computed(() => localized(props.song.subtitle))
const categoryName = computed(() =>
  [1, 2].includes(props.song.categoryType)
    ? t(`songList.category.${props.song.categoryType}`)
    : t('songList.otherCategory'),
)
const categoryStyle = computed(() => {
  const color = SONG_CATEGORY_COLORS[props.song.categoryType]
  return color ? { color } : undefined
})
const singer = computed(() => localized(props.song.singerName))
const members = computed(() =>
  props.song.characterIds.flatMap((id) => {
    const character = props.payload.characters.find((entry) => entry.id === id)
    if (!character) return []
    const name = resolveLocalizedName(character.name, props.gameLocale)
    return name.text
      ? [
          {
            id,
            name: name.text,
            lang: name.lang,
            iconUrl: getCharacterIconUrl(character.assetId),
          },
        ]
      : []
  }),
)
const memberText = computed(() =>
  members.value.map((member) => member.name).join(' / '),
)
const singerExpanded = ref(false)
const singerId = `song-singer-members-${props.song.id}`
const duration = computed(
  () =>
    `${Math.floor(props.song.playingSeconds / 60)}:${String(props.song.playingSeconds % 60).padStart(2, '0')}`,
)
const formatDate = (value: string | null) => {
  if (!value) return '—'
  const timestamp = Number(value)
  const date = new Date(timestamp)
  return Number.isFinite(timestamp) && !Number.isNaN(date.getTime())
    ? `${new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeZone: 'Asia/Tokyo' }).format(date)} ${new Intl.DateTimeFormat(locale.value, { timeStyle: 'short', timeZone: 'Asia/Tokyo' }).format(date)} JST`
    : '—'
}
const charts = computed(() =>
  [...props.song.difficulties].sort((a, b) => a.type - b.type),
)
const unlockType = computed(() => getSongUnlockType(props.song))
const availableVideos = computed(() =>
  props.song.musicVideos.filter((video) => video.assetId?.trim()),
)
const hasMv = computed(() => hasSongMv(props.song))
const hasLive = computed(() => hasSongLive(props.song))
const hasBody = computed(() =>
  (['title', 'singer', 'notes', 'unlock', 'availability'] as const).some(
    hasField,
  ),
)
const songListRowSpan = computed(
  () =>
    1 +
    Number(hasField('charts')) +
    Number(hasField('title') || hasField('singer')) +
    (['notes', 'unlock', 'availability'] as const).filter(hasField).length +
    Number(hasField('musicVideos') || hasField('streamingMute')),
)
const subgridStyle = computed(() => ({
  '--song-list-row-span': String(songListRowSpan.value),
}))
const hasStatusTags = computed(
  () =>
    (hasField('musicVideos') && (hasMv.value || hasLive.value)) ||
    (hasField('streamingMute') && props.song.isStreamingMuted),
)
function videoNames(kind: 'mv' | 'live') {
  return availableVideos.value
    .filter((video) => video.categoryId.endsWith(kind))
    .map(
      (video) =>
        localized(video.name) ||
        t(kind === 'mv' ? 'songList.mvLabel' : 'songList.liveLabel'),
    )
    .join(' · ')
}
</script>

<template>
  <li class="song-list-container--subgrid min-w-0" :style="subgridStyle">
    <article
      class="song-list-article--subgrid min-w-0 overflow-hidden rounded-xl border border-surface-200 bg-surface-0 shadow-sm dark:border-surface-700 dark:bg-surface-900"
      :style="subgridStyle"
      :aria-labelledby="`song-title-${song.id}`"
    >
      <div
        class="song-list-cover relative aspect-square min-w-0 overflow-hidden bg-surface-100 dark:bg-surface-800"
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
        <Tag
          v-if="hasField('category')"
          :value="categoryName"
          :style="categoryStyle"
          severity="secondary"
          rounded
          class="song-category-tag absolute left-2 top-2"
        >
          <template #icon>
            <Disc3 :size="20" :stroke-width="2" aria-hidden="true" />
          </template>
        </Tag>
        <Tag
          v-if="hasField('duration')"
          :value="duration"
          severity="secondary"
          rounded
          class="absolute bottom-2 right-2 tabular-nums shadow"
        />
        <h2
          v-if="!hasField('title')"
          :id="`song-title-${song.id}`"
          class="sr-only"
          :lang="title.lang"
        >
          {{ title.text }}
        </h2>
      </div>
      <div
        v-if="hasField('charts')"
        class="song-list-row grid min-w-0 grid-cols-4 border-b border-surface-200 bg-surface-100 text-center text-lg font-bold tabular-nums text-color dark:border-surface-700 dark:bg-surface-800"
      >
        <div
          v-for="type in [1, 2, 3, 4]"
          :key="type"
          class="min-w-0 border-b-4 px-1 py-1.5"
          :style="{ borderBottomColor: SONG_DIFFICULTY_COLORS[type] }"
        >
          <span class="sr-only">{{ t(`songList.difficulty.${type}`) }}</span>
          <span>{{
            charts.find((chart) => chart.type === type)?.level ?? '—'
          }}</span>
        </div>
      </div>
      <template v-if="hasBody">
        <section
          v-if="hasField('title') || hasField('singer')"
          class="song-list-row song-list-content-row min-w-0"
        >
          <template v-if="hasField('title')">
            <h2
              :id="`song-title-${song.id}`"
              class="min-w-0 break-words text-lg font-bold"
              :lang="title.lang"
            >
              {{ title.text }}
            </h2>
            <Divider
              v-if="subtitle"
              align="left"
              role="presentation"
              :aria-orientation="null"
              class="my-2 min-w-0"
              :pt="{ content: { class: 'min-w-0 max-w-full' } }"
            >
              <h3
                class="m-0 min-w-0 max-w-full text-sm font-semibold leading-snug text-muted-color wrap-anywhere"
              >
                {{ subtitle }}
              </h3>
            </Divider>
          </template>
          <div
            v-if="hasField('singer')"
            class="min-w-0 text-sm text-muted-color"
            :class="hasField('title') && 'mt-1'"
          >
            <button
              v-if="members.length"
              type="button"
              class="inline-flex max-w-full items-center gap-1 text-left hover:text-color focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              :aria-expanded="singerExpanded"
              :aria-controls="singerId"
              :title="memberText"
              @click="singerExpanded = !singerExpanded"
            >
              <span class="min-w-0 break-words">{{
                singer || memberText
              }}</span>
              <ChevronDown
                class="shrink-0"
                :class="singerExpanded && 'rotate-180'"
                :size="20"
                :stroke-width="2"
                aria-hidden="true"
              />
            </button>
            <span v-else>{{ singer || '—' }}</span>
            <ul
              v-if="members.length"
              v-show="singerExpanded"
              :id="singerId"
              class="mt-1 space-y-0.5 pl-4"
              :aria-label="t('songList.members')"
            >
              <li
                v-for="member in members"
                :key="member.id"
                class="flex items-center gap-2"
                :lang="member.lang"
              >
                <CardListIcon
                  :src="member.iconUrl"
                  label=""
                  size="large"
                  loading-skeleton
                />
                <span>{{ member.name }}</span>
              </li>
            </ul>
          </div>
        </section>
        <section
          v-if="hasField('notes')"
          class="song-list-row song-list-content-row min-w-0"
        >
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
              {{ t('songList.field.notes') }}
            </h3>
          </Divider>
          <dl class="grid grid-cols-4 gap-1 text-center text-sm tabular-nums">
            <div v-for="type in [1, 2, 3, 4]" :key="type" class="min-w-0">
              <dt class="text-xs text-muted-color">
                {{ t(`songList.difficulty.${type}`) }}
              </dt>
              <dd class="mb-0">
                {{
                  charts
                    .find((chart) => chart.type === type)
                    ?.fullComboNoteCount.toLocaleString(locale) ?? '—'
                }}
              </dd>
            </div>
          </dl>
        </section>
        <section
          v-if="hasField('unlock')"
          class="song-list-row song-list-content-row min-w-0"
        >
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
              {{ t('songList.field.unlock') }}
            </h3>
          </Divider>
          <p class="mb-0 text-sm">
            {{
              unlockType === 'none'
                ? t('songList.none')
                : t(`songList.unlockType.${unlockType}`)
            }}
          </p>
          <p
            v-if="unlockType !== 'none' && localized(song.lockDescription)"
            class="mb-0 text-sm text-muted-color"
          >
            {{ localized(song.lockDescription) }}
          </p>
        </section>
        <section
          v-if="hasField('availability')"
          class="song-list-row song-list-content-row min-w-0"
        >
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
              {{ t('songList.field.availability') }}
            </h3>
          </Divider>
          <p class="mb-0 text-sm">{{ formatDate(song.startTime) }}</p>
        </section>
      </template>
      <div
        v-if="hasField('musicVideos') || hasField('streamingMute')"
        class="song-list-row song-list-tags-row min-w-0"
      >
        <footer
          v-if="hasStatusTags"
          class="flex min-w-0 flex-wrap gap-2 border-t border-surface-200 p-4 dark:border-surface-700"
        >
          <template v-if="hasField('musicVideos')">
            <Tag
              v-if="hasMv"
              :value="t('songList.mvLabel')"
              :title="videoNames('mv')"
              severity="secondary"
              rounded
            />
            <Tag
              v-if="hasLive"
              :value="t('songList.liveLabel')"
              :title="videoNames('live')"
              severity="secondary"
              rounded
            />
          </template>
          <Tag
            v-if="hasField('streamingMute') && song.isStreamingMuted"
            :value="t('songList.muted')"
            severity="secondary"
            rounded
          />
        </footer>
      </div>
    </article>
  </li>
</template>

<style scoped>
.song-list-container--subgrid {
  display: grid;
  grid-row: span var(--song-list-row-span);
  grid-template-rows: subgrid;
  margin-block-end: 1.25rem;
}

.song-list-article--subgrid {
  display: grid;
  grid-row: 1 / -1;
  grid-template-rows: subgrid;
}

.song-list-cover {
  grid-row: 1;
}

.song-list-content-row {
  padding: 0.5rem 1rem;
}

.song-category-tag {
  --p-tag-icon-size: 20px;
  background: transparent;
  border: 1px solid currentColor;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.9));
}
</style>
