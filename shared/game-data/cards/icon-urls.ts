import type { CardStatKey } from './list-data.ts'

export const cardIconDataPath = '/data/card-icons.json'

export interface CardIconUrls {
  stats: Record<CardStatKey, string>
  attributes: Partial<Record<number, string>>
}
