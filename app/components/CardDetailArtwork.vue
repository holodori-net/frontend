<script setup lang="ts">
import {
  getCardCharacterDecorationUrl,
  getCardDetailArtworkUrl,
} from '#shared/game-data/card-icons'
import type { CardDetailPayload } from '#shared/game-data/card-detail'
import type { GameLocale } from '#shared/language'

const props = defineProps<{
  cardName: { text: string; lang: string }
  characterName: { text: string; lang: string }
  characterAssetId: string | null
  characterId: string
  characterGroups: CardDetailPayload['characterGroups']
  gameLocale: GameLocale
}>()

const { themes } = useMemberTheme()
const titleColor = computed(
  () => themes.value?.find(({ id }) => id === props.characterId)?.color4,
)
const titleMaskId = `card-detail-title-mask-${useId()}`
const titleBase = getCardDetailArtworkUrl('titleBase')
const { status, imageElement, onLoad, onError } = useImageLoading(titleBase)
</script>

<template>
  <div class="min-w-0 pl-8 lg:pl-0">
    <div
      class="card-detail-artwork"
      :style="{ '--card-title-color': titleColor }"
    >
      <header class="card-detail-artwork__title">
        <img
          ref="imageElement"
          :src="titleBase"
          alt=""
          aria-hidden="true"
          class="hidden"
          @load="onLoad"
          @error="onError"
        />
        <div
          v-if="status !== 'loaded'"
          class="card-detail-artwork__title-fallback"
          aria-hidden="true"
        />
        <svg class="absolute size-0" aria-hidden="true" focusable="false">
          <defs>
            <mask
              :id="titleMaskId"
              maskUnits="objectBoundingBox"
              maskContentUnits="objectBoundingBox"
              style="mask-type: alpha"
            >
              <g transform="scale(0.0010245901639344 0.0060975609756098)">
                <CardDetailSpriteMask
                  :src="titleBase"
                  :width="976"
                  :height="164"
                  :source-width="141"
                  :source-height="164"
                  :left="87.5"
                  :right="53.5"
                />
              </g>
            </mask>
          </defs>
        </svg>
        <div
          class="card-detail-artwork__title-layers"
          :style="{ maskImage: `url(#${titleMaskId})` }"
          aria-hidden="true"
        >
          <div
            class="card-detail-artwork__glitter"
            :style="{
              backgroundImage: `url('${getCardDetailArtworkUrl('titleGlitter')}')`,
            }"
          />
          <div
            class="card-detail-artwork__wave"
            :style="{
              backgroundImage: `url('${getCardDetailArtworkUrl('titleWave')}')`,
            }"
          />
          <div
            class="card-detail-artwork__glow"
            :style="{
              borderImageSource: `url('${getCardDetailArtworkUrl('titleGlow')}')`,
            }"
          />
        </div>
        <div
          class="card-detail-artwork__title-outline"
          :style="{
            borderImageSource: `url('${getCardDetailArtworkUrl('titleOutline')}')`,
          }"
          aria-hidden="true"
        />
        <div class="card-detail-artwork__title-content">
          <h1 :lang="cardName.lang">{{ cardName.text }}</h1>
          <div class="card-detail-artwork__name-row">
            <p :lang="characterName.lang">{{ characterName.text }}</p>
            <CardDetailGroupingLabel
              v-for="group in characterGroups"
              :key="group.id"
              :group="group"
              :game-locale="gameLocale"
            />
          </div>
        </div>
      </header>

      <div class="card-detail-artwork__frame">
        <div
          v-if="characterAssetId"
          class="card-detail-artwork__ornaments"
          aria-hidden="true"
        >
          <CardDetailDecoration
            :src="getCardCharacterDecorationUrl(characterAssetId, 'chain')"
            class="card-detail-artwork__chain"
          />
          <CardDetailDecoration
            :src="getCardCharacterDecorationUrl(characterAssetId, 'motif')"
            class="card-detail-artwork__motif"
          />
        </div>
        <div
          class="card-detail-artwork__frame-base"
          :style="{
            borderImageSource: `url('${getCardDetailArtworkUrl('cardBase')}')`,
          }"
          aria-hidden="true"
        />
        <div
          class="card-detail-artwork__frame-outline"
          :style="{
            borderImageSource: `url('${getCardDetailArtworkUrl('cardOutline')}')`,
          }"
          aria-hidden="true"
        />
        <div class="card-detail-artwork__card"><slot /></div>
        <div
          v-if="characterAssetId"
          class="card-detail-artwork__wiring-mask"
          :style="{
            maskImage: `url('${getCardDetailArtworkUrl('ringMask')}')`,
          }"
          aria-hidden="true"
        >
          <CardDetailDecoration
            :src="getCardCharacterDecorationUrl(characterAssetId, 'wiring')"
            class="card-detail-artwork__wiring"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-detail-artwork {
  display: flow-root;
  container-type: inline-size;
  --artwork-unit: calc(100cqw / 1024);
}

.card-detail-artwork__title {
  position: relative;
  z-index: 1;
  width: calc(976 * var(--artwork-unit));
  min-height: calc(164 * var(--artwork-unit));
  margin-top: calc(10 * var(--artwork-unit));
  margin-left: calc(8 * var(--artwork-unit));
  transform: rotate(-1deg);
  transform-origin: calc(32 * var(--artwork-unit)) 50%;
}

.card-detail-artwork__title-layers,
.card-detail-artwork__title-outline,
.card-detail-artwork__glitter,
.card-detail-artwork__glow,
.card-detail-artwork__frame-base,
.card-detail-artwork__frame-outline {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.card-detail-artwork__title-layers {
  overflow: hidden;
  background: var(--card-title-color, var(--p-primary-800));
}

.card-detail-artwork__glitter {
  background-size: calc(217 * var(--artwork-unit))
    calc(217 * var(--artwork-unit));
  background-position: calc(-4.268 * var(--artwork-unit))
    calc(342.777 * var(--artwork-unit));
}

.card-detail-artwork__wave {
  position: absolute;
  left: 20.3794%;
  top: 68.2896%;
  width: 104.8197%;
  height: 303.1585%;
  background-size: 20% 100%;
  background-repeat: repeat-x;
  background-position: -8.25% 0;
  opacity: calc(115 / 255);
  transform: rotate(151deg) scaleY(-1);
}

.card-detail-artwork__glow {
  border: calc(70 * var(--artwork-unit)) solid transparent;
  border-image-slice: 70 fill;
}

.card-detail-artwork__title-outline {
  border: solid transparent;
  border-width: 0 calc(53.5 * var(--artwork-unit)) 0
    calc(87.5 * var(--artwork-unit));
  border-image-slice: 0 53 0 87 fill;
}

.card-detail-artwork__frame-base,
.card-detail-artwork__frame-outline {
  border: calc(70 * var(--artwork-unit)) solid transparent;
  border-image-slice: 69 fill;
}

.card-detail-artwork__frame-base {
  opacity: 0.65;
}

.card-detail-artwork__title-fallback {
  position: absolute;
  inset: 0 calc(8 * var(--artwork-unit)) 0 calc(55 * var(--artwork-unit));
  border-radius: calc(40 * var(--artwork-unit));
  background: var(--card-title-color, var(--p-primary-800));
}

.card-detail-artwork__title-content {
  position: relative;
  padding: max(0.625rem, calc(24 * var(--artwork-unit)))
    calc(64 * var(--artwork-unit)) max(0.625rem, calc(24 * var(--artwork-unit)))
    max(2.5rem, calc(96 * var(--artwork-unit)));
  color: white;
  font-weight: 800;
  text-shadow:
    0 0 2px rgb(36 35 76 / 85%),
    0 0 4px rgb(36 35 76 / 65%);
}

.card-detail-artwork__title-content h1 {
  margin: 0;
  font-size: max(1rem, calc(36 * var(--artwork-unit)));
  font-weight: inherit;
  line-height: calc(49 / 36);
  overflow-wrap: anywhere;
}

.card-detail-artwork__name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(15 * var(--artwork-unit));
  min-height: calc(64 * var(--artwork-unit));
  margin-top: calc(3 * var(--artwork-unit));
}

.card-detail-artwork__name-row p {
  min-width: 0;
  margin: 0;
  font-size: max(1.5rem, calc(48 * var(--artwork-unit)));
  font-weight: inherit;
  line-height: calc(64 / 48);
  overflow-wrap: anywhere;
}

.card-detail-artwork__frame {
  position: relative;
  z-index: 2;
  width: calc(1012 * var(--artwork-unit));
  margin-top: calc(-30.506 * var(--artwork-unit));
  margin-left: calc(12 * var(--artwork-unit));
}

.card-detail-artwork__card {
  position: relative;
  margin-left: calc(36 * var(--artwork-unit));
  margin-right: calc(16 * var(--artwork-unit));
  padding-top: calc(38 * var(--artwork-unit));
  padding-bottom: calc(16 * var(--artwork-unit));
}

.card-detail-artwork__ornaments {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.card-detail-artwork__chain {
  left: calc(-47.984 * var(--artwork-unit));
  top: calc(22 * var(--artwork-unit));
  width: calc(77.988 * var(--artwork-unit));
  height: calc(166.375 * var(--artwork-unit));
  object-fit: fill;
}

.card-detail-artwork__motif {
  left: calc(-102.325 * var(--artwork-unit));
  top: calc(144.497 * var(--artwork-unit));
  width: calc(186.667 * var(--artwork-unit));
  height: calc(186.667 * var(--artwork-unit));
  object-fit: fill;
}

.card-detail-artwork__wiring-mask {
  position: absolute;
  left: calc(-176.017 * var(--artwork-unit));
  top: calc(-134.01 * var(--artwork-unit));
  width: calc(240 * var(--artwork-unit));
  height: calc(240 * var(--artwork-unit));
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
  mask-mode: alpha;
}

.card-detail-artwork__wiring {
  left: calc(11.371 * var(--artwork-unit));
  top: calc(12.37 * var(--artwork-unit));
  width: calc(214 * var(--artwork-unit));
  height: calc(214 * var(--artwork-unit));
  object-fit: fill;
  transform: rotate(104deg);
}

.card-detail-artwork__frame :deep(.card-list-content) {
  display: block;
  grid-row: auto;
  grid-template-rows: none;
  width: 100%;
  height: auto;
  padding: 0;
  overflow: visible;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.card-detail-artwork__frame :deep(.card-list-art) {
  overflow: visible;
  border-radius: calc(36 * var(--artwork-unit));
}

.card-detail-artwork__frame :deep(.card-list-art > img),
.card-detail-artwork__frame :deep(.card-image-skeleton) {
  border-radius: calc(36 * var(--artwork-unit));
}

.card-detail-artwork__frame :deep(.card-list-art > .top-1) {
  left: calc(-8 * var(--artwork-unit));
  top: calc(-8 * var(--artwork-unit));
}

.card-detail-artwork__frame :deep(.card-list-art > .top-1 img) {
  width: calc(72 * var(--artwork-unit));
  height: calc(72 * var(--artwork-unit));
}

.card-detail-artwork__frame :deep(.card-list-art > .top-11) {
  left: calc(-16 * var(--artwork-unit));
  top: calc(72 * var(--artwork-unit));
  bottom: calc(8 * var(--artwork-unit));
}

.card-detail-artwork__frame
  :deep(.card-list-art > .top-11 > span > .relative.inline-flex) {
  width: calc(56 * var(--artwork-unit));
  height: calc(56 * var(--artwork-unit));
  max-height: calc(56 * var(--artwork-unit));
  margin-top: calc(-16 * var(--artwork-unit));
}

.card-detail-artwork__frame
  :deep(.card-list-art > .top-11 > span > .relative.inline-flex:first-child) {
  margin-top: 0;
}
</style>
