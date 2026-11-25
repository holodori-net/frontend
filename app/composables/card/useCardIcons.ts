import { inject, provide, type InjectionKey, type Ref } from 'vue'
import {
  cardIconDataPath,
  type CardIconUrls,
} from '#shared/game-data/cards/icon-urls'
import type { CardStatKey } from '#shared/game-data/cards/list-data'

const cardIconUrlsKey: InjectionKey<Ref<CardIconUrls | undefined>> =
  Symbol('card-icon-urls')

export function provideCardIcons() {
  const { data } = useLazyAsyncData(
    'card-icon-urls',
    (_app, { signal }) =>
      $fetch<CardIconUrls>(cardIconDataPath, { signal, retry: 0 }),
    {
      // The URLs only change with a new build, so client navigation reuses
      // the first successful result instead of refetching it on every page.
      getCachedData: (key, nuxtApp) =>
        nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
    },
  )
  provide(cardIconUrlsKey, data)
}

export function useCardIcons() {
  // No default: a component rendered outside a provider triggers Vue's
  // missing-injection warning in development.
  const urls = inject(cardIconUrlsKey)

  return {
    getCardStatIconUrl: (stat: CardStatKey) => urls?.value?.stats[stat] ?? null,
    getCardAttributeIconUrl: (attribute: number) =>
      urls?.value?.attributes[attribute] ?? null,
  }
}
