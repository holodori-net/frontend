import type { CardStatKey } from './list-data.ts'

export const cardIconDirectory = 'card-icons'

export const cardStatSprites: Record<CardStatKey, string> = {
  performance: 'ui_999_ico_performance',
  technique: 'ui_999_ico_technique',
  sense: 'ui_999_ico_sense',
}

export const cardAttributeSprites: Readonly<
  Record<number, string | undefined>
> = {
  1: 'ui_999_ico_element_cute_cl',
  2: 'ui_999_ico_element_pure_cl',
  3: 'ui_999_ico_element_happy_cl',
}
