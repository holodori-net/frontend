import type { CharacterData } from './characters.ts'
import { resolveLocalizedName, type GameLocale } from '../language.ts'

const productions = [
  {
    id: 'prd-jp',
    name: {
      jpn: 'ホロライブ',
      eng: 'hololive',
      ind: 'hololive',
      kor: 'hololive',
      cht: 'hololive',
      chs: 'hololive',
    },
  },
  {
    id: 'prd-id',
    name: {
      jpn: 'ホロライブ ID',
      eng: 'hololive ID',
      ind: 'hololive ID',
      kor: 'hololive ID',
      cht: 'hololive ID',
      chs: 'hololive ID',
    },
  },
  {
    id: 'prd-en',
    name: {
      jpn: 'ホロライブ EN',
      eng: 'hololive EN',
      ind: 'hololive EN',
      kor: 'hololive EN',
      cht: 'hololive EN',
      chs: 'hololive EN',
    },
  },
  {
    id: 'prd-dev_is',
    name: {
      jpn: 'DEV_IS',
      eng: 'DEV_IS',
      ind: 'DEV_IS',
      kor: 'DEV_IS',
      cht: 'DEV_IS',
      chs: 'DEV_IS',
    },
  },
] as const

const characterAssetRoles = {
  icon: 'img_chr_icon_normal',
} as const

export function getCharacterIconUrl(assetId: string | null) {
  if (!assetId) return null
  const name = `${characterAssetRoles.icon}_${assetId}`
  return `https://assets.holodori.net/cdn/${name}/Texture2D/${name}.webp`
}

export function getCharacterSections<
  T extends Pick<CharacterData, 'id' | 'productionId' | 'order'>,
>(characters: readonly T[], gameLocale: GameLocale) {
  const sorted = [...characters].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  )
  const sections: {
    id: string
    name: string | null
    characters: T[]
  }[] = productions.map((production) => ({
    id: production.id,
    name: resolveLocalizedName(production.name, gameLocale).text,
    characters: sorted.filter(
      (character) => character.productionId === production.id,
    ),
  }))
  const knownIds = new Set<string>(
    productions.map((production) => production.id),
  )
  const otherCharacters = sorted.filter(
    (character) => !knownIds.has(character.productionId ?? ''),
  )
  if (otherCharacters.length) {
    sections.push({ id: 'other', name: null, characters: otherCharacters })
  }
  return sections.filter((section) => section.characters.length > 0)
}
