import type { CardStatKey } from './list-data.ts'

export interface CardIconUrls {
  stats: Record<CardStatKey, string>
  attributes: Partial<Record<number, string>>
}
