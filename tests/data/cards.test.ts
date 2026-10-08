import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gameLocales } from '../../shared/language.ts'
import { transformCards } from '../../scripts/data/transforms/cards.ts'

describe('card data transform', () => {
  let database: DatabaseSync

  beforeEach(() => {
    database = new DatabaseSync(':memory:')
    database.exec(`
      CREATE TABLE Card (id TEXT, character_id TEXT, name_lang_id TEXT, rarity INTEGER,
        attribute_type INTEGER, asset_id TEXT, asset_type INTEGER, vertical_anchor_type INTEGER,
        horizontal_anchor_type INTEGER, "order" INTEGER, card_level_group_id TEXT,
        card_level_limit_group_id TEXT, card_potential_group_id TEXT,
        performance_permil_multiply INTEGER, technique_permil_multiply INTEGER,
        sense_permil_multiply INTEGER);
      CREATE TABLE LangCard (language TEXT, id TEXT, text TEXT);
      INSERT INTO Card VALUES
        ('card-b', 'c2', 'name-b', 3, 4, NULL, 5, 6, 7, 1, 'levels', 'limits', 'potential', 1000, 900, 800),
        ('card-a', 'c1', 'name-a', 2, 3, 'asset-card', 4, 5, 6, 1, 'levels', 'limits', 'potential', 700, 800, 900);
    `)
    const insertTranslation = database.prepare(
      'INSERT INTO LangCard (language, id, text) VALUES (?, ?, ?)',
    )
    for (const id of ['name-a', 'name-b']) {
      for (const locale of gameLocales) {
        insertTranslation.run(locale, id, `${id}-${locale}`)
      }
    }
  })

  afterEach(() => database.close())

  it('sorts equal-order cards by id and preserves localized fields', () => {
    const cards = transformCards(database)
    expect(cards.map(({ id }) => id)).toEqual(['card-a', 'card-b'])
    expect(cards[0]).toMatchObject({
      characterId: 'c1',
      name: {
        jpn: 'name-a-jpn',
        eng: 'name-a-eng',
        ind: 'name-a-ind',
        kor: 'name-a-kor',
        cht: 'name-a-cht',
        chs: 'name-a-chs',
      },
      assetId: 'asset-card',
      growth: {
        levelGroupId: 'levels',
        levelLimitGroupId: 'limits',
        potentialGroupId: 'potential',
        weightsPermil: { performance: 700, technique: 800, sense: 900 },
      },
    })
    expect(cards[1]!.assetId).toBeNull()
    expect(cards[1]!).not.toHaveProperty('backgroundAssetId')
    expect(cards[1]!.growth.levelGroupId).toBe(cards[0]!.growth.levelGroupId)
    expect(cards[1]!.name.eng).toBe('name-b-eng')
  })

  it('reports missing and null localized names with source context', () => {
    database.exec(
      "DELETE FROM LangCard WHERE id = 'name-a' AND language = 'ind'",
    )
    expect(() => transformCards(database)).toThrow(
      'Card.name_lang_id in row card-a',
    )
    database.exec("INSERT INTO LangCard VALUES ('ind', 'name-a', NULL)")
    expect(() => transformCards(database)).toThrow('Missing ind translation')
    database.exec(
      "UPDATE LangCard SET text = '' WHERE id = 'name-a' AND language = 'ind'",
    )
    expect(transformCards(database)[0]!.name.ind).toBe('')
  })
})
