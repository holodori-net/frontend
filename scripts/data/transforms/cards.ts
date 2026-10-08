import type { DatabaseSync } from 'node:sqlite'
import type { TransformModule } from '../contract.ts'
import { localizedText } from '../common/localized-text.ts'
import type { CardData } from '../../../shared/game-data/cards.ts'

export function transformCards(database: DatabaseSync): CardData[] {
  const rows = database
    .prepare(
      `SELECT id, character_id, name_lang_id, rarity, attribute_type, asset_id,
              asset_type, vertical_anchor_type, horizontal_anchor_type, "order",
              card_level_group_id, card_level_limit_group_id,
              card_potential_group_id, performance_permil_multiply,
              technique_permil_multiply, sense_permil_multiply
       FROM Card ORDER BY "order", id`,
    )
    .all() as {
    id: string
    character_id: string
    name_lang_id: string
    rarity: number
    attribute_type: number
    asset_id: string | null
    asset_type: number
    vertical_anchor_type: number
    horizontal_anchor_type: number
    order: number
    card_level_group_id: string
    card_level_limit_group_id: string
    card_potential_group_id: string
    performance_permil_multiply: number
    technique_permil_multiply: number
    sense_permil_multiply: number
  }[]
  const nameStatement = database.prepare(
    'SELECT language, text FROM LangCard WHERE id = ?',
  )

  return rows.map((row) => ({
    id: row.id,
    characterId: row.character_id,
    name: localizedText(nameStatement, row.name_lang_id, {
      languageTable: 'LangCard',
      table: 'Card',
      field: 'name_lang_id',
      rowId: row.id,
    }),
    rarity: row.rarity,
    attributeType: row.attribute_type,
    assetId: row.asset_id,
    assetType: row.asset_type,
    verticalAnchorType: row.vertical_anchor_type,
    horizontalAnchorType: row.horizontal_anchor_type,
    order: row.order,
    growth: {
      levelGroupId: row.card_level_group_id,
      levelLimitGroupId: row.card_level_limit_group_id,
      potentialGroupId: row.card_potential_group_id,
      weightsPermil: {
        performance: row.performance_permil_multiply,
        technique: row.technique_permil_multiply,
        sense: row.sense_permil_multiply,
      },
    },
  }))
}

export const cardsTransform: TransformModule<CardData[]> = {
  fileName: 'cards.json',
  run(database) {
    const data = transformCards(database)
    return { data, summary: `${data.length} cards` }
  },
}
