import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gameLocales } from '../../shared/language.ts'
import { createGameDatabase } from '../../server/data/database.ts'
import { transformCharacterGroups } from '../../server/data/converters/character-groups.ts'

let database: DatabaseSync

beforeEach(() => {
  database = new DatabaseSync(':memory:')
  database.exec(`
    CREATE TABLE CharacterGrouping (
      id TEXT, name_lang_id TEXT, description_lang_id TEXT, is_regular INTEGER,
      character_ids TEXT, asset_id TEXT, color1 TEXT, color2 TEXT, "order" INTEGER
    );
    CREATE TABLE LangCharacterGrouping (language TEXT, id TEXT, text TEXT);
    INSERT INTO CharacterGrouping VALUES
      ('g-b', 'group-b', 'description-b', NULL, NULL, 'asset-b', '#111111', '#222222', 1),
      ('g-a', 'group-a', 'description-a', 1, '["c2","c1"]', 'asset-a', '#333333', '#444444', 1),
      ('g-0', 'group-c', 'description-c', 0, '[]', 'asset-c', '#555555', '#666666', 2);
  `)

  const insertTranslation = database.prepare(
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
      insertTranslation.run(locale, id, `${id}-${locale}`)
    }
  }
})

afterEach(() => database.close())

describe('character group transform', () => {
  it('maps all localized fields and preserves source member order', () => {
    const groups = transformCharacterGroups(createGameDatabase(database))
    expect(groups.map(({ id }) => id)).toEqual(['g-a', 'g-b', 'g-0'])
    expect(groups[0]).toEqual({
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
    })
    expect(groups[1]).toMatchObject({ isRegular: false, characterIds: [] })
    expect(groups[2]).toMatchObject({
      id: 'g-0',
      order: 2,
      isRegular: false,
      characterIds: [],
    })
  })

  it.each([
    ['name', 'group-a', ''],
    ['name', 'group-a', '-'],
    ['description', 'description-a', ''],
    ['description', 'description-a', '-'],
  ] as const)('preserves %s text value %j', (field, textId, value) => {
    database
      .prepare(
        'UPDATE LangCharacterGrouping SET text = ? WHERE id = ? AND language = ?',
      )
      .run(value, textId, 'ind')
    const group = transformCharacterGroups(createGameDatabase(database))[0]!
    expect(group[field].ind).toBe(value)
  })

  it.each([
    ['name_lang_id', 'group-a'],
    ['description_lang_id', 'description-a'],
  ])('fails when %s translation is missing or null', (field, textId) => {
    database
      .prepare(
        'DELETE FROM LangCharacterGrouping WHERE id = ? AND language = ?',
      )
      .run(textId, 'ind')
    expect(() =>
      transformCharacterGroups(createGameDatabase(database)),
    ).toThrow(`CharacterGrouping.${field} in row g-a`)

    database
      .prepare(
        'INSERT INTO LangCharacterGrouping (language, id, text) VALUES (?, ?, NULL)',
      )
      .run('ind', textId)
    expect(() =>
      transformCharacterGroups(createGameDatabase(database)),
    ).toThrow('Missing ind translation in LangCharacterGrouping')
  })

  it('reports malformed member JSON with source context and parser cause', () => {
    database.exec(
      "UPDATE CharacterGrouping SET character_ids = '{' WHERE id = 'g-a'",
    )
    let error: Error | undefined
    try {
      transformCharacterGroups(createGameDatabase(database))
    } catch (caught) {
      error = caught as Error
    }
    expect(error?.message).toContain(
      'CharacterGrouping.character_ids for row g-a',
    )
    expect(error?.cause).toBeInstanceOf(SyntaxError)
  })
})
