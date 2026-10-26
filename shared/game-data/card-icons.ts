import type { CardStatKey } from './card-list-data.ts'
import { getMemberThemeAssets } from '../theme.ts'

const cardAtlasBaseUrl =
  'https://assets.holodori.net/apk/bundle/5c7dca536fc387da111cc16aed58d394.bundle/images/'
const cardDetailArtworkUrls = {
  cardBase:
    cardAtlasBaseUrl +
    'bfa641a9f542ee531a7b07da2f9a129ac8409314e48baffc3681aa6a07d6c75d.webp',
  cardOutline:
    cardAtlasBaseUrl +
    '61f78acdca1e547fb7b5ca6d4e177fdcaf4d98ff4f5bd055a9c2028f5eb41eb6.webp',
  titleBase:
    cardAtlasBaseUrl +
    'b0e3b14d03ac6a009cf6b1b693f7fd7f9b55629d4774356192bec62093689bef.webp',
  titleOutline:
    cardAtlasBaseUrl +
    'a4ea5e64632f0975d7cecf00e1347f376d6b6dc01eecdbe85978e4cbe20ed4e6.webp',
  titleGlow:
    'https://assets.holodori.net/apk/bundle/e7f629315795970b8fbc94cf21766d2c.bundle/images/c7267769dac529e36f7f4ff5c61bda567bee2aa94e8487e49842eb6d68a7e38f.webp',
  titleGlitter:
    'https://assets.holodori.net/apk/bundle/b2257aa649ca1aa6fb7b75e405610a47.bundle/images/3c85dcf434cad0b22e5932c32ac2e0102e62a09ff93fd45f79160a6dddec7ef8.webp',
  titleWave:
    'https://assets.holodori.net/apk/bundle/5a37a2b6fe150ea29663029aa16734c2.bundle/images/25e6af2b9e0102f9f3cf2d4b3093b61ee366c61600aa69aacd6ce75aff44b3aa.webp',
  ringMask:
    cardAtlasBaseUrl +
    '72476779c471f442d966eaf74d43d634b9be36392f3899fc0255975066c9a06e.webp',
} as const

export type CardDetailArtworkKind = keyof typeof cardDetailArtworkUrls

export function getCardDetailArtworkUrl(kind: CardDetailArtworkKind): string {
  return cardDetailArtworkUrls[kind]
}

export function getCardDetailSwitchMotifUrl(
  characterAssetId: string | null,
): string | null {
  return getMemberThemeAssets(characterAssetId).motifMain
}

const cardCharacterDecorationNames = {
  wiring: 'img_chr_key_wiring',
  ring: 'img_chr_key_ring',
  chain: 'img_chr_key_chain',
  motif: 'img_chr_motif_main',
} as const

export type CardCharacterDecorationRole =
  keyof typeof cardCharacterDecorationNames

export function getCardCharacterDecorationUrl(
  characterAssetId: string | null,
  role: CardCharacterDecorationRole,
): string | null {
  if (!characterAssetId) return null
  const name = `${cardCharacterDecorationNames[role]}_${characterAssetId}`
  return `https://assets.holodori.net/cdn/${name}/Texture2D/${name}.webp`
}

const cardSkillIconFiles = {
  specialSkill: {
    base: '35a0f572b53c92b357129039d19db51f201554a4f419026075ac85d3834c4990.webp',
    label:
      'fe51710636e5b0530df88d6177c3019dc4033d21fdcf3ae02a561c71b7444aef.webp',
  },
  activeSkill: {
    base: '656a840a8980389998ce11b17e18e56cfed06502a27f70f3d0e0c0da2fcaed6b.webp',
    label:
      'e03552391badac2bf131f19cbed44e05dab3a150dc841c3950ef2e00ca461e63.webp',
  },
  passiveSkill: {
    base: '8f9b8f600f9c19f843516cc9247f6cb206600d0705240be165e02042845e7dd3.webp',
    label:
      'd0042d8ad39a7e1fbc54d6e68201b65704f68395d7411703d929d5424c23c489.webp',
  },
} as const

export type CardSkillIconKind = keyof typeof cardSkillIconFiles

const activeSkillEffectNames: Readonly<Record<number, string>> = {
  1: 'scoreuppermilup',
  2: 'scoreuppermilupbasedonperformance',
  3: 'scoreuppermilupbasedontechnique',
  4: 'scoreuppermilupbasedonsense',
  5: 'scoreupeffectuppermilup',
  6: 'liveactiveskillactivationprobabilityuppermilup',
  7: 'liveactiveskillcooltimeshortenpermilup',
  8: 'liferecovery',
  9: 'judgementenhance',
  10: 'lifereductionnullify',
}
const passiveSkillEffectNames: Readonly<Record<number, string>> = {
  1: 'performanceup',
  2: 'techniqueup',
  3: 'senseup',
  4: 'performanceuppermilup',
  5: 'techniqueuppermilup',
  6: 'senseuppermilup',
  7: 'allparameterup',
  8: 'allparameteruppermilup',
  9: 'lifeup',
  10: 'liveactiveskilleffectuppermilup',
  11: 'liveactiveskillactivationprobabilityuppermilup',
  12: 'liveactiveskillcooltimeshortenpermilup',
  13: 'liverewardquantityuppermilup',
}

export function getCardSkillEffectIconUrl(
  kind: CardSkillIconKind,
  effectType: number | null,
): string | null {
  if (effectType === null) return null
  const passive = kind === 'passiveSkill'
  const effectName = (
    passive ? passiveSkillEffectNames : activeSkillEffectNames
  )[effectType]
  if (!effectName) return null
  const name = `img_skill_icon_${passive ? 'passive' : 'active'}_${effectName}`
  return `https://assets.holodori.net/cdn/${name}/Texture2D/${name}.webp`
}

export function getCardSkillIconUrl(kind: CardSkillIconKind): string {
  return cardAtlasBaseUrl + cardSkillIconFiles[kind].base
}

export function getCardSkillLabelIconUrl(kind: CardSkillIconKind): string {
  return cardAtlasBaseUrl + cardSkillIconFiles[kind].label
}

export function getCostumeThumbnailUrl(assetId: string | null): string | null {
  if (!assetId) return null
  const name = `img_cos_2d_thumb_${assetId}`
  return `https://assets.holodori.net/cdn/${name}/Texture2D/${name}.webp`
}

export function getCardMovieUrl(
  assetId: string | null,
  variant: 'full_0' | 'full_1' | 'sign',
): string | null {
  if (!assetId) return null
  const sourceName = `mov_card_${variant}_${assetId}`
  return `https://assets.holodori.net/cdn/${sourceName}.usm/VideoClip/${sourceName}.webm`
}

export function getCardVoiceUrl(assetId: string | null): string | null {
  if (!assetId) return null
  return `https://assets.holodori.net/cdn/${assetId}.acb/AudioClip/${assetId}.flac`
}

export const cardRarityAnimationUrl =
  'https://assets.holodori.net/apk/generated/animations/ef_ui_999_rare_anim_001--da09250dd35035f2.webp'

const cardIconBaseUrl =
  'https://assets.holodori.net/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/images/'

const cardStatIconFiles: Record<CardStatKey, string> = {
  performance:
    'fda8c7e65195e951d1377fd5fb4f9c81a6daa9caef404c3657d320c416b66567.webp',
  technique:
    '08f60d28093a1909096e5706a5948d20cd8069b45bc5df5dac0a561188cf03c4.webp',
  sense:
    'b5f24c6de38deb04da2abe1f0d1683dbb01b4a9c926029e25ac782999c71a67f.webp',
}

const cardAttributeIconFiles: Record<number, string> = {
  1: 'a1770ef8e7b17c9ce0af89515ea14e807697691e275e25fcd0a671dc76f0366d.webp',
  2: 'a718262cf15e366794a5a88447c0087336a65eada13e8a583ae4fce3285ad047.webp',
  3: 'd9c82e6c2f4d2b5db81c0c87c3e631f08dabff3494ed5c5bff953ee0487db404.webp',
}

export function getCardStatIconUrl(stat: CardStatKey): string {
  return `${cardIconBaseUrl}${cardStatIconFiles[stat]}`
}

export function getCardAttributeIconUrl(attribute: number): string | null {
  const file = cardAttributeIconFiles[attribute]
  return file ? `${cardIconBaseUrl}${file}` : null
}

const cardDetailGroupingArtworkUrls = {
  base: 'https://assets.holodori.net/apk/bundle/e7f629315795970b8fbc94cf21766d2c.bundle/images/8e537f8cee89f4adfc9338801f07210ec08a763faee21802b53f92abee62af75.webp',
  outline:
    'https://assets.holodori.net/apk/bundle/e7f629315795970b8fbc94cf21766d2c.bundle/images/c1fa35009b3410cc90b0a1cc931e0a79d031cd817330693019f0902ee8964260.webp',
} as const

export type CardDetailGroupingArtworkKind =
  keyof typeof cardDetailGroupingArtworkUrls

export function getCardDetailGroupingArtworkUrl(
  kind: CardDetailGroupingArtworkKind,
): string {
  return cardDetailGroupingArtworkUrls[kind]
}
