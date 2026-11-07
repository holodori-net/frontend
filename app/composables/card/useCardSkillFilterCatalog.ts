import type { NuxtApp } from '#app'
import type { CardListPayload } from '#shared/game-data/cards/list-data'
import {
  buildCardSkillFilterCatalog,
  type CardSkillFilterCatalog,
} from '#shared/game-data/cards/skill-filter'

const catalogs = new WeakMap<NuxtApp, CardSkillFilterCatalog>()

export function useCardSkillFilterCatalog(payload: CardListPayload) {
  const nuxtApp = useNuxtApp()
  let catalog = catalogs.get(nuxtApp)
  if (!catalog) {
    catalog = buildCardSkillFilterCatalog(payload)
    catalogs.set(nuxtApp, catalog)
  }
  return catalog
}
