import type { ConnectPosition } from './skill-tree-connect-effects.ts'
import type { CardListPayload } from './card-list-data.ts'

export type CardConnectShape =
  'rectangle' | 'halfDiamond' | 'ray' | 'corner' | 'cross' | 'diamond' | 'line'

export type CardConnectDirection =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'upLeft'
  | 'downLeft'
  | 'downRight'
  | 'upRight'
  | 'vertical'
  | 'all'
  | 'leftBias'
  | 'rightBias'

export interface CardConnectFilterOption {
  key: string
  positions: readonly ConnectPosition[]
  shape: CardConnectShape | null
  direction: CardConnectDirection | null
}

export interface CardConnectFilterCatalog {
  options: CardConnectFilterOption[]
  cardExtents: Record<string, string[]>
}

const metadata: Record<
  string,
  { shape: CardConnectShape; direction: CardConnectDirection }
> = {
  'card_area-001': { shape: 'rectangle', direction: 'leftBias' },
  'card_area-002': { shape: 'halfDiamond', direction: 'left' },
  'card_area-003': { shape: 'ray', direction: 'right' },
  'card_area-004': { shape: 'corner', direction: 'upLeft' },
  'center_area-001': { shape: 'cross', direction: 'up' },
  'center_area-002': { shape: 'cross', direction: 'right' },
  'center_area-003': { shape: 'cross', direction: 'left' },
  'center_area-004': { shape: 'corner', direction: 'downLeft' },
  'center_area-005': { shape: 'cross', direction: 'down' },
  'content_area-001': { shape: 'rectangle', direction: 'rightBias' },
  'content_area-002': { shape: 'halfDiamond', direction: 'right' },
  'content_area-003': { shape: 'ray', direction: 'left' },
  'content_area-004': { shape: 'corner', direction: 'downRight' },
  'general_purpose_area-001': { shape: 'diamond', direction: 'all' },
  'leader_area-001': { shape: 'line', direction: 'vertical' },
  'leader_area-002': { shape: 'ray', direction: 'down' },
  'leader_area-003': { shape: 'corner', direction: 'upRight' },
}

const shortExtentId = (id: string) =>
  id.replace(/^skill_tree_connect_effect_extent-/, '')

export function buildCardConnectFilterCatalog(
  payload: Pick<CardListPayload, 'cards' | 'connectEffects' | 'connectExtents'>,
): CardConnectFilterCatalog {
  const referenced = new Set<string>()
  const cardExtents: Record<string, string[]> = {}

  for (const card of payload.cards) {
    const groups = new Set<string>()
    if (card.skillTreeConnectEffectId !== null) {
      for (const level of payload.connectEffects[
        card.skillTreeConnectEffectId
      ] ?? []) {
        groups.add(level.extentGroupId)
        referenced.add(level.extentGroupId)
      }
    }
    cardExtents[card.id] = [...groups].sort()
  }

  const options = [...referenced].sort().map((key): CardConnectFilterOption => {
    const positions = payload.connectExtents[key]
    const shapeMetadata = metadata[shortExtentId(key)]
    return {
      key,
      positions: positions ?? [],
      shape: shapeMetadata?.shape ?? null,
      direction: shapeMetadata?.direction ?? null,
    }
  })

  return { options, cardExtents }
}

export function countCardConnectOptions(
  options: readonly CardConnectFilterOption[],
  cardIds: readonly string[],
  cardExtents: Readonly<Record<string, readonly string[]>>,
): Record<string, number> {
  const counts = Object.fromEntries(options.map(({ key }) => [key, 0]))
  for (const cardId of new Set(cardIds)) {
    for (const extentId of new Set(cardExtents[cardId] ?? [])) {
      if (extentId in counts) counts[extentId] = (counts[extentId] ?? 0) + 1
    }
  }
  return counts
}
