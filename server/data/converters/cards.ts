import { asc, eq, sql } from 'drizzle-orm'
import type { CardData } from '#shared/game-data/cards'
import { localizedText } from '../common/localized-text.ts'
import type { GameDatabase } from '../database.ts'
import { card, langCard } from '../schema/cards.ts'

export function transformCards(database: GameDatabase): CardData[] {
  const rows = database
    .select({
      id: card.id,
      characterId: card.characterId,
      nameLangId: card.nameLangId,
      rarity: card.rarity,
      attributeType: card.attributeType,
      assetId: card.assetId,
      assetType: card.assetType,
      verticalAnchorType: card.verticalAnchorType,
      horizontalAnchorType: card.horizontalAnchorType,
      order: card.order,
      cardLevelGroupId: card.cardLevelGroupId,
      cardLevelLimitGroupId: card.cardLevelLimitGroupId,
      cardPotentialGroupId: card.cardPotentialGroupId,
      performancePermilMultiply: card.performancePermilMultiply,
      techniquePermilMultiply: card.techniquePermilMultiply,
      sensePermilMultiply: card.sensePermilMultiply,
    })
    .from(card)
    .orderBy(asc(card.order), asc(card.id))
    .all()
  const nameQuery = database
    .select({ language: langCard.language, text: langCard.text })
    .from(langCard)
    .where(eq(langCard.id, sql.placeholder('id')))
    .prepare()

  return rows.map((row) => ({
    id: row.id,
    characterId: row.characterId,
    name: localizedText(nameQuery.all({ id: row.nameLangId }), row.nameLangId, {
      languageTable: 'LangCard',
      table: 'Card',
      field: 'name_lang_id',
      rowId: row.id,
    }),
    rarity: row.rarity,
    attributeType: row.attributeType,
    assetId: row.assetId,
    assetType: row.assetType,
    verticalAnchorType: row.verticalAnchorType,
    horizontalAnchorType: row.horizontalAnchorType,
    order: row.order,
    growth: {
      levelGroupId: row.cardLevelGroupId,
      levelLimitGroupId: row.cardLevelLimitGroupId,
      potentialGroupId: row.cardPotentialGroupId,
      weightsPermil: {
        performance: row.performancePermilMultiply,
        technique: row.techniquePermilMultiply,
        sense: row.sensePermilMultiply,
      },
    },
  }))
}
