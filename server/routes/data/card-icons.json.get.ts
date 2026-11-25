import type { CardIconUrls } from '#shared/game-data/cards/icon-urls'
import { readCardIconUrls } from '../../data/card-icons'

export default defineEventHandler((event) => {
  const snapshot = useRuntimeConfig(event).cardIconUrls as
    CardIconUrls | undefined
  return snapshot ?? readCardIconUrls()
})
