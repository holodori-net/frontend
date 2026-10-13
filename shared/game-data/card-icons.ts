import type { CardStatKey } from './card-list-data.ts'

export const cardRaritySpriteSheetUrl =
  'https://assets.holodori.net/cdn/tln_gacha-001/Texture2D/ef_ui_999_rare_anim_001.png'
export const cardRarityStaticUrl =
  'https://assets.holodori.net/cdn/tln_gacha-001/Sprite/ef_ui_999_rare_anim_001_0.png'

const cardIconBaseUrl =
  'https://assets.holodori.net/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/images/'

const cardStatIconFiles: Record<CardStatKey, string> = {
  performance:
    'fda8c7e65195e951d1377fd5fb4f9c81a6daa9caef404c3657d320c416b66567.png',
  technique:
    '08f60d28093a1909096e5706a5948d20cd8069b45bc5df5dac0a561188cf03c4.png',
  sense: 'b5f24c6de38deb04da2abe1f0d1683dbb01b4a9c926029e25ac782999c71a67f.png',
}

const cardAttributeIconFiles: Record<number, string> = {
  1: 'a1770ef8e7b17c9ce0af89515ea14e807697691e275e25fcd0a671dc76f0366d.png',
  2: 'a718262cf15e366794a5a88447c0087336a65eada13e8a583ae4fce3285ad047.png',
  3: 'd9c82e6c2f4d2b5db81c0c87c3e631f08dabff3494ed5c5bff953ee0487db404.png',
}

export function getCardStatIconUrl(stat: CardStatKey): string {
  return `${cardIconBaseUrl}${cardStatIconFiles[stat]}`
}

export function getCardAttributeIconUrl(attribute: number): string | null {
  const file = cardAttributeIconFiles[attribute]
  return file ? `${cardIconBaseUrl}${file}` : null
}
