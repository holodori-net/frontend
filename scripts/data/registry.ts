import type { TransformModule } from './contract.ts'
import { charactersTransform } from './transforms/characters.ts'
import { cardsTransform } from './transforms/cards.ts'
import { cardGrowthTransform } from './transforms/card-growth.ts'
import { characterGroupsTransform } from './transforms/character-groups.ts'

export const transformModules = [
  charactersTransform,
  cardsTransform,
  cardGrowthTransform,
  characterGroupsTransform,
] satisfies TransformModule[]
