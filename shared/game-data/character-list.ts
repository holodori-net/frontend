import type { CharacterData } from './characters.ts'

const productions = [
  { id: 'prd-jp', name: 'hololive' },
  { id: 'prd-id', name: 'hololive ID' },
  { id: 'prd-en', name: 'hololive EN' },
  { id: 'prd-dev_is', name: 'DEV_IS' },
] as const

const characterAssetRoles = {
  icon: 'img_chr_icon_normal',
} as const

export function getCharacterIconUrl(assetId: string | null) {
  if (!assetId) return null
  const name = `${characterAssetRoles.icon}_${assetId}`
  return `https://assets.holodori.net/cdn/${name}/Texture2D/${name}.png`
}

export function getCharacterSections<
  T extends Pick<CharacterData, 'id' | 'productionId' | 'order'>,
>(characters: readonly T[]) {
  const sorted = [...characters].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  )
  const sections: {
    id: string
    name: string | null
    characters: T[]
  }[] = productions.map((production) => ({
    ...production,
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
