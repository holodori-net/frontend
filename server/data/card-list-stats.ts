import type { CardData } from '#shared/game-data/cards'
import type { CardGrowthData } from '#shared/game-data/card-growth'
import type { CardListItemData } from '#shared/game-data/card-list-data'
import { calculateCardStats } from '#shared/game-data/card-stats'
const allParameterUpPermilUpEffectType = 4

export function calculateCardListStats(
  card: CardData,
  baseValue: number,
  growth: CardGrowthData,
): Pick<CardListItemData, 'stats' | 'total' | 'specializations'> {
  const potentialBonus = (growth.potentials[card.growth.potentialGroupId] ?? [])
    .filter((effect) => effect.effectType === allParameterUpPermilUpEffectType)
    .reduce((sum, effect) => sum + effect.value, 0)

  return calculateCardStats(
    card.growth.weightsPermil,
    baseValue,
    potentialBonus,
  )
}
