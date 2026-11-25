import { inject, provide, type InjectionKey, type Ref } from 'vue'
import {
  cardIconDataPath,
  type CardIconUrls,
} from '#shared/game-data/cards/icon-urls'
import type { CardStatKey } from '#shared/game-data/cards/list-data'

const cardIconUrlsKey: InjectionKey<Ref<CardIconUrls | undefined>> =
  Symbol('card-icon-urls')

export function provideCardIcons() {
  const { data } = useLazyAsyncData('card-icon-urls', (_app, { signal }) =>
    $fetch<CardIconUrls>(cardIconDataPath, { signal, retry: 0 }),
  )
  provide(cardIconUrlsKey, data)
}

export function useCardIcons() {
  const urls = inject(cardIconUrlsKey, undefined)

  return {
    getCardStatIconUrl: (stat: CardStatKey) => urls?.value?.stats[stat] ?? null,
    getCardAttributeIconUrl: (attribute: number) =>
      urls?.value?.attributes[attribute] ?? null,
  }
}
