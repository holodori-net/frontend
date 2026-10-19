import type { CardStatKey } from './card-list-data.ts'

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
