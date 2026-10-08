import { DatabaseSync } from 'node:sqlite'
import { afterAll, describe, expect, it } from 'vitest'
import { gameLocales } from '../shared/language'
import {
  transformCardGrowth,
  transformCards,
  transformCharacters,
  transformCharacterGroups,
} from '../scripts/data/transform'

const database = new DatabaseSync(':memory:')
afterAll(() => database.close())

database.exec(`
  CREATE TABLE Character (id TEXT, name_lang_id TEXT, asset_id TEXT, is_playable INTEGER, regular_character_grouping_ids TEXT, "order" INTEGER);
  CREATE TABLE LangCharacter (language TEXT, id TEXT, text TEXT);
  CREATE TABLE Card (id TEXT, character_id TEXT, name_lang_id TEXT, rarity INTEGER,
    attribute_type INTEGER, asset_id TEXT, background_asset_id TEXT, asset_type INTEGER,
    vertical_anchor_type INTEGER, horizontal_anchor_type INTEGER, "order" INTEGER,
    card_level_group_id TEXT, card_level_limit_group_id TEXT, card_potential_group_id TEXT,
    performance_permil_multiply INTEGER, technique_permil_multiply INTEGER, sense_permil_multiply INTEGER);
  CREATE TABLE LangCard (language TEXT, id TEXT, text TEXT);
  CREATE TABLE CharacterGrouping (id TEXT, name_lang_id TEXT, description_lang_id TEXT,
    is_regular INTEGER, character_ids TEXT, asset_id TEXT, color1 TEXT, color2 TEXT, "order" INTEGER);
  CREATE TABLE LangCharacterGrouping (language TEXT, id TEXT, text TEXT);
  CREATE TABLE CardLevel (group_id TEXT, level INTEGER, parameter_base_value TEXT);
  CREATE TABLE CardLevelLimit (group_id TEXT, limit_break_count INTEGER, level_limit INTEGER);
  CREATE TABLE CardPotential (group_id TEXT, upgrade_count INTEGER, effect_type INTEGER, value TEXT);

  INSERT INTO Character VALUES ('c2', 'character-2', NULL, 0, NULL, 2), ('c1', 'character-1', 'asset-c1', 1, '["g2","g1"]', 1);
  INSERT INTO LangCharacter VALUES
    ('jpn', 'character-1', 'キャラ一'), ('eng', 'character-1', 'Character One'),
    ('ind', 'character-1', 'Karakter Satu'), ('kor', 'character-1', '캐릭터 하나'),
    ('cht', 'character-1', '角色一'), ('chs', 'character-1', '角色一'),
    ('jpn', 'character-2', 'キャラ二'), ('eng', 'character-2', 'Character Two'),
    ('ind', 'character-2', 'Karakter Dua'), ('kor', 'character-2', '캐릭터 둘'),
    ('cht', 'character-2', '角色二'), ('chs', 'character-2', '角色二');
  INSERT INTO Card VALUES
    ('card-b', 'c2', 'card-name-b', 3, 4, NULL, 'unused-background', 5, 6, 7, 1, 'shared', 'limits', 'potential', 1000, 900, 800),
    ('card-a', 'c1', 'card-name-a', 2, 3, 'asset-card', 'unused-background', 4, 5, 6, 1, 'shared', 'limits', 'potential', 700, 800, 900);
  INSERT INTO LangCard VALUES
    ('eng', 'card-name-a', 'Card A'), ('jpn', 'card-name-a', 'カードA'),
    ('ind', 'card-name-a', 'Kartu A'), ('kor', 'card-name-a', '카드 A'),
    ('cht', 'card-name-a', '卡片甲'), ('chs', 'card-name-a', '卡片甲'),
    ('eng', 'card-name-b', 'Card B'), ('jpn', 'card-name-b', 'カードB'),
    ('ind', 'card-name-b', 'Kartu B'), ('kor', 'card-name-b', '카드 B'),
    ('cht', 'card-name-b', '卡片乙'), ('chs', 'card-name-b', '卡片乙');
  INSERT INTO CharacterGrouping VALUES
    ('g-b', 'group-b', 'description-b', NULL, NULL, 'asset-b', '#111111', '#222222', 1),
    ('g-a', 'group-a', 'description-a', 1, '["c2","c1"]', 'asset-a', '#333333', '#444444', 1),
    ('g-0', 'group-c', 'description-c', 0, '[]', 'asset-c', '#555555', '#666666', 2);
  INSERT INTO CardLevel VALUES ('unused-levels', 2, '125'), ('shared', 2, '2025'), ('shared', 1, '105');
  INSERT INTO CardLevelLimit VALUES ('unused-limits', 0, 10), ('limits', 0, 20), ('limits', 2, 60);
  INSERT INTO CardPotential VALUES ('unused-potential', 0, 9, '125'), ('potential', 0, 2, '0'),
    ('potential', 1, 1, '350'), ('potential', 1, 0, '250');
`)

const insertGroupTranslation = database.prepare(
  'INSERT INTO LangCharacterGrouping (language, id, text) VALUES (?, ?, ?)',
)
for (const id of [
  'group-a',
  'group-b',
  'group-c',
  'description-a',
  'description-b',
  'description-c',
]) {
  for (const locale of gameLocales) {
    insertGroupTranslation.run(locale, id, `${id}-${locale}`)
  }
}

describe('data transforms', () => {
  it('joins localized names through each entity language id and sorts entities', () => {
    const characters = transformCharacters(database)
    expect(characters.map(({ id }) => id)).toEqual(['c1', 'c2'])
    expect(characters[0]!).toMatchObject({
      name: {
        jpn: 'キャラ一',
        eng: 'Character One',
        ind: 'Karakter Satu',
        kor: '캐릭터 하나',
        cht: '角色一',
        chs: '角色一',
      },
      assetId: 'asset-c1',
      isPlayable: true,
      regularGroupIds: ['g2', 'g1'],
    })
    expect(characters[1]!).toMatchObject({
      name: { jpn: 'キャラ二', cht: '角色二', ind: 'Karakter Dua' },
      assetId: null,
      isPlayable: false,
      regularGroupIds: [],
    })

    const cards = transformCards(database)
    expect(cards.map(({ id }) => id)).toEqual(['card-a', 'card-b'])
    expect(cards[0]!).toMatchObject({
      characterId: 'c1',
      name: { jpn: 'カードA', eng: 'Card A' },
      assetId: 'asset-card',
      growth: {
        levelGroupId: 'shared',
        weightsPermil: { performance: 700, technique: 800, sense: 900 },
      },
    })
    expect(cards[1]!.assetId).toBeNull()
    expect(cards[1]!).not.toHaveProperty('backgroundAssetId')
    expect(cards[1]!.growth.levelGroupId).toBe(cards[0]!.growth.levelGroupId)
  })

  it('keeps unused growth groups and converts numeric text in stable group order', () => {
    expect(transformCardGrowth(database)).toEqual({
      levels: {
        shared: [
          { level: 1, parameterBaseValue: 105 },
          { level: 2, parameterBaseValue: 2025 },
        ],
        'unused-levels': [{ level: 2, parameterBaseValue: 125 }],
      },
      levelLimits: {
        limits: [
          { limitBreakCount: 0, levelLimit: 20 },
          { limitBreakCount: 2, levelLimit: 60 },
        ],
        'unused-limits': [{ limitBreakCount: 0, levelLimit: 10 }],
      },
      potentials: {
        potential: [
          { upgradeCount: 0, effectType: 2, value: 0 },
          { upgradeCount: 1, effectType: 0, value: 250 },
          { upgradeCount: 1, effectType: 1, value: 350 },
        ],
        'unused-potential': [{ upgradeCount: 0, effectType: 9, value: 125 }],
      },
    })
  })

  it('converts every localized group field and preserves ordered group members', () => {
    expect(transformCharacterGroups(database)).toEqual([
      {
        id: 'g-a',
        name: {
          jpn: 'group-a-jpn',
          eng: 'group-a-eng',
          ind: 'group-a-ind',
          kor: 'group-a-kor',
          cht: 'group-a-cht',
          chs: 'group-a-chs',
        },
        description: {
          jpn: 'description-a-jpn',
          eng: 'description-a-eng',
          ind: 'description-a-ind',
          kor: 'description-a-kor',
          cht: 'description-a-cht',
          chs: 'description-a-chs',
        },
        isRegular: true,
        characterIds: ['c2', 'c1'],
        assetId: 'asset-a',
        color1: '#333333',
        color2: '#444444',
        order: 1,
      },
      {
        id: 'g-b',
        name: {
          jpn: 'group-b-jpn',
          eng: 'group-b-eng',
          ind: 'group-b-ind',
          kor: 'group-b-kor',
          cht: 'group-b-cht',
          chs: 'group-b-chs',
        },
        description: {
          jpn: 'description-b-jpn',
          eng: 'description-b-eng',
          ind: 'description-b-ind',
          kor: 'description-b-kor',
          cht: 'description-b-cht',
          chs: 'description-b-chs',
        },
        isRegular: false,
        characterIds: [],
        assetId: 'asset-b',
        color1: '#111111',
        color2: '#222222',
        order: 1,
      },
      {
        id: 'g-0',
        name: {
          jpn: 'group-c-jpn',
          eng: 'group-c-eng',
          ind: 'group-c-ind',
          kor: 'group-c-kor',
          cht: 'group-c-cht',
          chs: 'group-c-chs',
        },
        description: {
          jpn: 'description-c-jpn',
          eng: 'description-c-eng',
          ind: 'description-c-ind',
          kor: 'description-c-kor',
          cht: 'description-c-cht',
          chs: 'description-c-chs',
        },
        isRegular: false,
        characterIds: [],
        assetId: 'asset-c',
        color1: '#555555',
        color2: '#666666',
        order: 2,
      },
    ])
  })

  it('keeps an explicit empty character group list empty', () => {
    database.exec(
      "UPDATE Character SET regular_character_grouping_ids = '[]' WHERE id = 'c1'",
    )
    expect(transformCharacters(database)[0]!.regularGroupIds).toEqual([])
    database.exec(
      'UPDATE Character SET regular_character_grouping_ids = \'["g2","g1"]\' WHERE id = \'c1\'',
    )
  })

  it('reports missing and null group translations with source field context', () => {
    database.exec(
      "DELETE FROM LangCharacterGrouping WHERE id = 'group-a' AND language = 'ind'",
    )
    expect(() => transformCharacterGroups(database)).toThrow(
      'CharacterGrouping.name_lang_id in row g-a',
    )
    database.exec(
      "INSERT INTO LangCharacterGrouping VALUES ('ind', 'group-a', NULL)",
    )
    expect(() => transformCharacterGroups(database)).toThrow(
      'Missing ind translation',
    )
    database.exec(
      "UPDATE LangCharacterGrouping SET text = '' WHERE id = 'group-a' AND language = 'ind'",
    )
    expect(transformCharacterGroups(database)[0]!.name.ind).toBe('')
    database.exec(
      "UPDATE LangCharacterGrouping SET text = '-' WHERE id = 'group-a' AND language = 'ind'",
    )
    expect(transformCharacterGroups(database)[0]!.name.ind).toBe('-')
    database.exec(
      "UPDATE LangCharacterGrouping SET text = 'group-a-ind' WHERE id = 'group-a' AND language = 'ind'",
    )

    database.exec(
      "DELETE FROM LangCharacterGrouping WHERE id = 'description-a' AND language = 'ind'",
    )
    expect(() => transformCharacterGroups(database)).toThrow(
      'CharacterGrouping.description_lang_id in row g-a',
    )
    database.exec(
      "INSERT INTO LangCharacterGrouping VALUES ('ind', 'description-a', NULL)",
    )
    expect(() => transformCharacterGroups(database)).toThrow(
      'Missing ind translation',
    )
    database.exec(
      "UPDATE LangCharacterGrouping SET text = '' WHERE id = 'description-a' AND language = 'ind'",
    )
    expect(transformCharacterGroups(database)[0]!.description.ind).toBe('')
    database.exec(
      "UPDATE LangCharacterGrouping SET text = '-' WHERE id = 'description-a' AND language = 'ind'",
    )
    expect(transformCharacterGroups(database)[0]!.description.ind).toBe('-')
    database.exec(
      "UPDATE LangCharacterGrouping SET text = 'description-a-ind' WHERE id = 'description-a' AND language = 'ind'",
    )
  })

  it('reports malformed JSON with the original parser error as cause', () => {
    database.exec(
      "UPDATE CharacterGrouping SET character_ids = '{' WHERE id = 'g-a'",
    )
    let error: Error | undefined
    try {
      transformCharacterGroups(database)
    } catch (caught) {
      error = caught as Error
    }
    expect(error?.message).toContain(
      'CharacterGrouping.character_ids for row g-a',
    )
    expect(error?.cause).toBeInstanceOf(SyntaxError)
    database.exec(
      'UPDATE CharacterGrouping SET character_ids = \'["c2","c1"]\' WHERE id = \'g-a\'',
    )
    database.exec(
      "UPDATE Character SET regular_character_grouping_ids = '{' WHERE id = 'c1'",
    )
    try {
      transformCharacters(database)
    } catch (caught) {
      error = caught as Error
    }
    expect(error?.message).toContain(
      'Character.regular_character_grouping_ids for row c1',
    )
    expect(error?.cause).toBeInstanceOf(SyntaxError)
    database.exec(
      'UPDATE Character SET regular_character_grouping_ids = \'["g2","g1"]\' WHERE id = \'c1\'',
    )
  })

  it('reports missing localized names with the source row context', () => {
    database.exec(
      "DELETE FROM LangCharacter WHERE id = 'character-1' AND language = 'ind'",
    )
    expect(() => transformCharacters(database)).toThrow(
      'Missing ind translation in LangCharacter for character-1',
    )
    database.exec(
      "INSERT INTO LangCharacter VALUES ('ind', 'character-1', NULL)",
    )
    expect(() => transformCharacters(database)).toThrow(
      'Missing ind translation in LangCharacter for character-1',
    )
    database.exec(
      "UPDATE LangCharacter SET text = 'Karakter Satu' WHERE id = 'character-1' AND language = 'ind'",
    )
  })
})
