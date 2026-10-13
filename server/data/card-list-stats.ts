import type { CardData } from '#shared/game-data/cards'
import type { CardGrowthData } from '#shared/game-data/card-growth'
import type {
  CardListItemData,
  CardStatKey,
} from '#shared/game-data/card-list-data'

const statKeys: CardStatKey[] = ['performance', 'technique', 'sense']
const allParameterUpPermilUpEffectType = 4

export function calculateCardListStats(
  card: CardData,
  baseValue: number,
  growth: CardGrowthData,
): Pick<CardListItemData, 'stats' | 'total' | 'specializations'> {
  const potentialBonus = (growth.potentials[card.growth.potentialGroupId] ?? [])
    .filter((effect) => effect.effectType === allParameterUpPermilUpEffectType)
    .reduce((sum, effect) => sum + effect.value, 0)

  const base = Math.fround(baseValue)
  const bonus = Math.fround(potentialBonus)
  const multiplier = Math.fround(Math.fround(bonus / 1000) + Math.fround(1))
  const stats = Object.fromEntries(
    statKeys.map((key) => {
      const basePermil = Math.fround(base / 1000)
      const weighted = Math.fround(
        basePermil * Math.fround(card.growth.weightsPermil[key]),
      )
      return [key, Math.ceil(Math.fround(weighted * multiplier))]
    }),
  ) as Record<CardStatKey, number>
  const highestWeight = Math.max(
    ...statKeys.map((key) => card.growth.weightsPermil[key]),
  )

  return {
    stats,
    total: stats.performance + stats.technique + stats.sense,
    specializations: statKeys.filter(
      (key) => card.growth.weightsPermil[key] === highestWeight,
    ),
  }
}
