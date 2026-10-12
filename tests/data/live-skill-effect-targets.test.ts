import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gameLocales } from '../../shared/language.ts'
import { createGameDatabase } from '../../server/data/database.ts'
import { transformLiveSkillEffectTargets } from '../../server/data/converters/live-skill-effect-targets.ts'

let database: DatabaseSync

beforeEach(() => {
  database = new DatabaseSync(':memory:')
  database.exec(`
    CREATE TABLE LiveSkillEffectTarget (
      id TEXT PRIMARY KEY, type INTEGER NOT NULL, target_count INTEGER,
      character_id TEXT, character_grouping_id TEXT, card_attribute_type INTEGER,
      description_lang_id TEXT NOT NULL
    );
    CREATE TABLE LangGeneratedLiveSkillEffectTarget (
      language TEXT NOT NULL, id TEXT NOT NULL, text TEXT,
      PRIMARY KEY (language, id)
    );
    INSERT INTO LiveSkillEffectTarget VALUES
      ('target-b', 3, NULL, 'character-2', NULL, NULL, 'description-b'),
      ('target-a', 99, 0, NULL, 'group-1', 2, 'description-a');
  `)

  const insertTranslation = database.prepare(
    'INSERT INTO LangGeneratedLiveSkillEffectTarget (language, id, text) VALUES (?, ?, ?)',
  )
  for (const id of ['description-a', 'description-b']) {
    for (const locale of gameLocales) {
      insertTranslation.run(locale, id, `${id}-${locale}`)
    }
  }
})

afterEach(() => database.close())

describe('live skill effect target transform', () => {
  it('sorts by id and maps numeric, nullable, and localized fields', () => {
    const targets = transformLiveSkillEffectTargets(
      createGameDatabase(database),
    )
    expect(targets.map(({ id }) => id)).toEqual(['target-a', 'target-b'])
    expect(targets[0]).toEqual({
      id: 'target-a',
      type: 99,
      targetCount: 0,
      characterId: null,
      characterGroupingId: 'group-1',
      cardAttributeType: 2,
      description: Object.fromEntries(
        gameLocales.map((locale) => [locale, `description-a-${locale}`]),
      ),
    })
    expect(targets[1]).toMatchObject({
      targetCount: null,
      characterId: 'character-2',
      characterGroupingId: null,
      cardAttributeType: null,
    })
  })

  it('preserves empty strings and source markup', () => {
    database
      .prepare(
        'UPDATE LangGeneratedLiveSkillEffectTarget SET text = ? WHERE id = ? AND language = ?',
      )
      .run('', 'description-a', 'ind')
    database
      .prepare(
        'UPDATE LangGeneratedLiveSkillEffectTarget SET text = ? WHERE id = ? AND language = ?',
      )
      .run('Deal [attribute] damage -', 'description-a', 'eng')

    const description = transformLiveSkillEffectTargets(
      createGameDatabase(database),
    )[0]!.description
    expect(description.ind).toBe('')
    expect(description.eng).toBe('Deal [attribute] damage -')
  })

  it.each(['missing', 'null'])(
    'fails with source context for %s translation',
    (kind) => {
      if (kind === 'missing') {
        database
          .prepare(
            'DELETE FROM LangGeneratedLiveSkillEffectTarget WHERE id = ? AND language = ?',
          )
          .run('description-a', 'ind')
      } else {
        database
          .prepare(
            'UPDATE LangGeneratedLiveSkillEffectTarget SET text = NULL WHERE id = ? AND language = ?',
          )
          .run('description-a', 'ind')
      }

      expect(() =>
        transformLiveSkillEffectTargets(createGameDatabase(database)),
      ).toThrow('LiveSkillEffectTarget.description_lang_id in row target-a')
      expect(() =>
        transformLiveSkillEffectTargets(createGameDatabase(database)),
      ).toThrow('Missing ind translation in LangGeneratedLiveSkillEffectTarget')
    },
  )
})
