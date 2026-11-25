import { inject, provide, type InjectionKey, type Ref } from 'vue'
import type { CardIconUrls } from '#shared/game-data/cards/icon-urls'
import type { CardStatKey } from '#shared/game-data/cards/list-data'

const cardIconUrlsKey: InjectionKey<Ref<CardIconUrls>> =
  Symbol('card-icon-urls')

export function provideCardIcons(urls: Ref<CardIconUrls>) {
  provide(cardIconUrlsKey, urls)
}

export function useCardIcons() {
  const urls = inject(cardIconUrlsKey, undefined)

  return {
    getCardStatIconUrl: (stat: CardStatKey) => urls?.value?.stats[stat] ?? null,
    getCardAttributeIconUrl: (attribute: number) =>
      urls?.value?.attributes[attribute] ?? null,
  }
}
