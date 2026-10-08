import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gameLocales } from '../../shared/language.ts'
import { transformCharacters } from '../../scripts/data/transforms/characters.ts'

describe('character transform', () => {
  let database: DatabaseSync

  beforeEach(() => {
    database = new DatabaseSync(':memory:')
    database.exec(`
      CREATE TABLE Character (
        id TEXT, name_lang_id TEXT, asset_id TEXT, is_playable INTEGER,
        regular_character_grouping_ids TEXT, "order" INTEGER
      );
      CREATE TABLE LangCharacter (language TEXT, id TEXT, text TEXT);
      INSERT INTO Character VALUES
        ('c2', 'character-2', NULL, 0, NULL, 2),
        ('c1', 'character-1', 'asset-c1', 1, '["g2","g1"]', 1);
    `)

    const insertTranslation = database.prepare(
      'INSERT INTO LangCharacter (language, id, text) VALUES (?, ?, ?)',
    )
    for (const [id, translations] of [
      [
        'character-1',
        [
          'キャラ一',
          'Character One',
          'Karakter Satu',
          '캐릭터 하나',
          '角色一',
          '角色一',
        ],
      ],
      [
        'character-2',
        [
          'キャラ二',
          'Character Two',
          'Karakter Dua',
          '캐릭터 둘',
          '角色二',
          '角色二',
        ],
      ],
    ] as const) {
      gameLocales.forEach((locale, index) => {
        insertTranslation.run(locale, id, translations[index]!)
      })
    }
  })

  afterEach(() => database.close())

  it('joins six localized names and sorts characters with nullable fields', () => {
    const characters = transformCharacters(database)

    expect(characters.map(({ id }) => id)).toEqual(['c1', 'c2'])
    expect(Object.keys(characters[0]!.name)).toEqual([
      'jpn',
      'eng',
      'ind',
      'kor',
      'cht',
      'chs',
    ])
    expect(characters[0]).toEqual({
      id: 'c1',
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
      order: 1,
    })
    expect(characters[1]).toMatchObject({
      assetId: null,
      isPlayable: false,
      regularGroupIds: [],
      order: 2,
    })
  })

  it('preserves explicit empty group ids and reports malformed JSON cause', () => {
    database.exec(
      "UPDATE Character SET regular_character_grouping_ids = '[]' WHERE id = 'c1'",
    )
    expect(transformCharacters(database)[0]!.regularGroupIds).toEqual([])

    database.exec(
      "UPDATE Character SET regular_character_grouping_ids = '{' WHERE id = 'c1'",
    )
    try {
      transformCharacters(database)
      throw new Error('Expected malformed JSON to fail')
    } catch (error) {
      expect(error).toMatchObject({
        message:
          'Invalid JSON in Character.regular_character_grouping_ids for row c1',
        cause: expect.any(SyntaxError),
      })
    }
  })

  it('reports missing and null translations with source field context', () => {
    database.exec(
      "DELETE FROM LangCharacter WHERE id = 'character-1' AND language = 'ind'",
    )
    expect(() => transformCharacters(database)).toThrow(
      'Character.name_lang_id in row c1',
    )

    database.exec(
      "INSERT INTO LangCharacter VALUES ('ind', 'character-1', NULL)",
    )
    expect(() => transformCharacters(database)).toThrow(
      'Missing ind translation in LangCharacter for character-1',
    )
  })
})
