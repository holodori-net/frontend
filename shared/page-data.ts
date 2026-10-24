export const pageDataPaths = {
  cards: '/data/cards.json',
  cardDetails: '/data/card-details.json',
  characters: '/data/characters.json',
} as const

export function cardDetailDataPath(id: string) {
  return `/data/cards/${encodeURIComponent(id)}.json`
}
