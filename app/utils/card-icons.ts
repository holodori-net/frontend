import iconUrls from '#build/card-icons'
import type { CardStatKey } from '#shared/game-data/cards/list-data'

export function getCardStatIconUrl(stat: CardStatKey): string {
  return iconUrls.stats[stat]
}

export function getCardAttributeIconUrl(attribute: number): string | null {
  const attributes: Partial<Record<number, string>> = iconUrls.attributes
  return attributes[attribute] ?? null
}
