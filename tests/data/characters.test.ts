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
        id TEXT, name_lang_id TEXT, short_name_lang_id TEXT,
        character_production_id TEXT, default_costume_id TEXT,
        default_sd_costume_id TEXT, birth_month INTEGER, birth_day INTEGER,
        debut_year INTEGER, debut_month INTEGER, debut_day INTEGER,
        fan_name_lang_id TEXT, description_lang_id TEXT, comment_lang_id TEXT,
        youtube_url TEXT, x_url TEXT, personality_type INTEGER,
        sd_personality_type INTEGER, is_playable INTEGER, asset_id TEXT,
        character_level_group_id TEXT, skill_tree_node_position_group_id TEXT,
        is_tutorial INTEGER, dominant_hand_type INTEGER, skill_tree_point_id TEXT,
        bgm_asset_id TEXT, regular_character_grouping_name_lang_id TEXT,
        color1 TEXT, color2 TEXT, color3 TEXT, color4 TEXT, color5 TEXT,
        "order" INTEGER, regular_character_grouping_ids TEXT,
        search_keyword_lang_ids TEXT, regular_character_grouping_name_eng TEXT,
        name_eng TEXT, short_name_eng TEXT
      );
      CREATE TABLE LangCharacter (language TEXT, id TEXT, text TEXT);
    `)

    database.exec(`
      INSERT INTO Character (id, name_lang_id, short_name_lang_id, "order", is_playable, is_tutorial)
      VALUES ('c2', 'name-2', 'short-2', 1, 0, 0),
             ('c1', 'name-1', 'short-1', 1, 1, 1);
      UPDATE Character SET
        default_costume_id = 'costume-2', default_sd_costume_id = 'sd-2',
        birth_month = 0, birth_day = 0,
        debut_year = 0, debut_month = 0, debut_day = 0,
        dominant_hand_type = 0
      WHERE id = 'c2';
      UPDATE Character SET
        character_production_id = 'production-1',
        default_costume_id = 'costume-1', default_sd_costume_id = 'sd-1',
        birth_month = 4, birth_day = 15,
        debut_year = 2020, debut_month = 6, debut_day = 7,
        fan_name_lang_id = 'fan-1', description_lang_id = 'description-1',
        comment_lang_id = 'comment-1', youtube_url = 'https://youtube.test',
        x_url = 'https://x.test', personality_type = 3, sd_personality_type = 2,
        asset_id = 'asset-1', character_level_group_id = 'level-1',
        skill_tree_node_position_group_id = 'position-1', dominant_hand_type = 1,
        skill_tree_point_id = 'point-1', bgm_asset_id = 'bgm-1',
        regular_character_grouping_name_lang_id = 'group-name-1',
        color1 = 'AABBCC', color2 = '112233', color4 = '445566', color5 = '778899',
        regular_character_grouping_ids = '["g2","g1"]',
        search_keyword_lang_ids = 'not-json',
        regular_character_grouping_name_eng = 'excluded-group',
        name_eng = 'excluded-name', short_name_eng = 'excluded-short'
      WHERE id = 'c1';
    `)

    const insertTranslation = database.prepare(
      'INSERT INTO LangCharacter (language, id, text) VALUES (?, ?, ?)',
    )
    const translations = new Map<string, string>([
      ['name-1', 'Character One'],
      ['short-1', 'Short One'],
      ['fan-1', 'Fan One'],
      ['description-1', 'Description One'],
      ['comment-1', 'Comment One'],
      ['group-name-1', 'Group One'],
      ['name-2', 'Character Two'],
      ['short-2', 'Short Two'],
    ])
    gameLocales.forEach((locale) => {
      for (const [id, english] of translations) {
        insertTranslation.run(locale, id, `${locale} ${english}`)
      }
    })
  })

  afterEach(() => database.close())

  it('exports all included fields, six-language text, and sorted rows', () => {
    const characters = transformCharacters(database)
    expect(characters.map(({ id }) => id)).toEqual(['c1', 'c2'])
    expect(characters[0]).toEqual({
      id: 'c1',
      name: Object.fromEntries(
        gameLocales.map((locale) => [locale, `${locale} Character One`]),
      ),
      shortName: Object.fromEntries(
        gameLocales.map((locale) => [locale, `${locale} Short One`]),
      ),
      productionId: 'production-1',
      birthday: { month: 4, day: 15 },
      debutDate: { year: 2020, month: 6, day: 7 },
      fanName: Object.fromEntries(
        gameLocales.map((locale) => [locale, `${locale} Fan One`]),
      ),
      description: Object.fromEntries(
        gameLocales.map((locale) => [locale, `${locale} Description One`]),
      ),
      comment: Object.fromEntries(
        gameLocales.map((locale) => [locale, `${locale} Comment One`]),
      ),
      youtubeUrl: 'https://youtube.test',
      xUrl: 'https://x.test',
      personalityType: 3,
      sdPersonalityType: 2,
      assetId: 'asset-1',
      isPlayable: true,
      regularGroupIds: ['g2', 'g1'],
      regularGroupName: Object.fromEntries(
        gameLocales.map((locale) => [locale, `${locale} Group One`]),
      ),
      order: 1,
      dominantHandType: 1,
      isTutorial: true,
      defaultCostumeId: 'costume-1',
      defaultSdCostumeId: 'sd-1',
      bgmAssetId: 'bgm-1',
      color1: 'AABBCC',
      color2: '112233',
      color3: null,
      color4: '445566',
      color5: '778899',
      growth: {
        levelGroupId: 'level-1',
        skillTreeNodePositionGroupId: 'position-1',
        skillTreePointId: 'point-1',
      },
    })
    expect(characters[0]).not.toHaveProperty('searchKeywords')
    expect(characters[0]).not.toHaveProperty('regularGroupNameEng')
    expect(characters[0]).not.toHaveProperty('nameEng')
    expect(characters[0]).not.toHaveProperty('shortNameEng')
  })

  it('preserves nulls, false flags, zero dates, and empty group arrays', () => {
    const character = transformCharacters(database)[1]!
    expect(character).toMatchObject({
      productionId: null,
      birthday: { month: 0, day: 0 },
      debutDate: { year: 0, month: 0, day: 0 },
      fanName: null,
      description: null,
      comment: null,
      youtubeUrl: null,
      xUrl: null,
      personalityType: null,
      sdPersonalityType: null,
      assetId: null,
      isPlayable: false,
      regularGroupIds: [],
      regularGroupName: null,
      isTutorial: false,
      color1: null,
      color2: null,
      color3: null,
      color4: null,
      color5: null,
      bgmAssetId: null,
      growth: {
        levelGroupId: null,
        skillTreeNodePositionGroupId: null,
        skillTreePointId: null,
      },
    })
    database.exec(
      "UPDATE Character SET is_playable = NULL, is_tutorial = NULL WHERE id = 'c2'",
    )
    expect(transformCharacters(database)[1]!.isPlayable).toBe(false)
    expect(transformCharacters(database)[1]!.isTutorial).toBeNull()
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

  it.each([
    ['name_lang_id', 'name-1'],
    ['short_name_lang_id', 'short-1'],
    ['fan_name_lang_id', 'fan-1'],
    ['description_lang_id', 'description-1'],
    ['comment_lang_id', 'comment-1'],
    ['regular_character_grouping_name_lang_id', 'group-name-1'],
  ])(
    'reports missing or null %s translations with source context',
    (field, id) => {
      database
        .prepare(`UPDATE Character SET ${field} = ? WHERE id = 'c1'`)
        .run(id)
      database
        .prepare('DELETE FROM LangCharacter WHERE id = ? AND language = ?')
        .run(id, 'ind')
      expect(() => transformCharacters(database)).toThrow(
        `Character.${field} in row c1`,
      )

      database
        .prepare('INSERT INTO LangCharacter VALUES (?, ?, NULL)')
        .run('ind', id)
      expect(() => transformCharacters(database)).toThrow(
        `Missing ind translation in LangCharacter for ${id} (Character.${field} in row c1)`,
      )
    },
  )
})
