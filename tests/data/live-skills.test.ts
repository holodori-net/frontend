import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gameLocales } from '../../shared/language.ts'
import { createGameDatabase } from '../../server/data/database.ts'
import { transformLiveSkillData } from '../../server/data/converters/live-skills.ts'
import { renderSkillDescription } from '../../shared/game-data/live-skill-description.ts'
import type { ConfirmedDescriptionTemplates } from '../../shared/game-data/live-skills.ts'

let database: DatabaseSync

function insertLanguages(
  table: string,
  id: string,
  text: (locale: string) => string,
) {
  const insert = database.prepare(
    `INSERT INTO ${table} (language, id, text) VALUES (?, ?, ?)`,
  )
  for (const locale of gameLocales) insert.run(locale, id, text(locale))
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  database = new DatabaseSync(':memory:')
  database.exec(`
    CREATE TABLE Character (id TEXT PRIMARY KEY, name_lang_id TEXT NOT NULL);
    CREATE TABLE LangCharacter (language TEXT, id TEXT, text TEXT, PRIMARY KEY(language, id));
    CREATE TABLE CharacterGrouping (id TEXT PRIMARY KEY, name_lang_id TEXT NOT NULL);
    CREATE TABLE LangCharacterGrouping (language TEXT, id TEXT, text TEXT, PRIMARY KEY(language, id));
    CREATE TABLE Costume (id TEXT PRIMARY KEY, character_id TEXT NOT NULL, name_lang_id TEXT NOT NULL, live_leader_skill_id TEXT);
    CREATE TABLE LangCostume (language TEXT, id TEXT, text TEXT, PRIMARY KEY(language, id));
    CREATE TABLE LiveLeaderSkill (id TEXT PRIMARY KEY, live_skill_trigger_group_id TEXT, live_passive_skill_effect_group_id TEXT NOT NULL, additional_live_skill_trigger_group_id TEXT, additional_live_passive_skill_effect_group_id TEXT);
    CREATE TABLE LivePassiveSkillEffect (group_id TEXT, number INTEGER, type INTEGER NOT NULL, value TEXT, live_skill_effect_target_id TEXT, resource_type INTEGER, resource_ids TEXT, description_lang_id TEXT NOT NULL, PRIMARY KEY(group_id, number));
    CREATE TABLE LangGeneratedLivePassiveSkillEffect (language TEXT, id TEXT, text TEXT, PRIMARY KEY(language, id));
    CREATE TABLE LiveSkillTrigger (group_id TEXT, number INTEGER, type INTEGER NOT NULL, threshold TEXT, character_ids TEXT, character_grouping_id TEXT, music_id TEXT, card_attribute_type INTEGER, live_note_judgement_type INTEGER, description_lang_id TEXT NOT NULL, PRIMARY KEY(group_id, number));
    CREATE TABLE LangGeneratedLiveSkillTrigger (language TEXT, id TEXT, text TEXT, PRIMARY KEY(language, id));
    CREATE TABLE LiveSkillEffectTarget (id TEXT PRIMARY KEY, type INTEGER NOT NULL, target_count INTEGER, character_id TEXT, character_grouping_id TEXT, card_attribute_type INTEGER, description_lang_id TEXT NOT NULL);
    CREATE TABLE LangGeneratedLiveSkillEffectTarget (language TEXT, id TEXT, text TEXT, PRIMARY KEY(language, id));
    INSERT INTO Character VALUES ('character-1', 'character-name');
    INSERT INTO CharacterGrouping VALUES ('group-1', 'group-name');
    INSERT INTO Costume VALUES ('costume-1', 'character-1', 'costume-name', 'skill-1');
    INSERT INTO LiveLeaderSkill VALUES ('skill-1', 'trigger-main', 'effect-main', 'trigger-extra', 'effect-extra');
    INSERT INTO LivePassiveSkillEffect VALUES
      ('effect-main', 2, 8, '200', 'target-all', NULL, NULL, 'effect-2'),
      ('effect-main', 1, 8, '150', 'target-all', 1, '["resource-1"]', 'effect-1'),
      ('effect-extra', 1, 99, NULL, NULL, NULL, NULL, 'effect-unknown');
    INSERT INTO LiveSkillTrigger VALUES
      ('trigger-main', 1, 9, '50', NULL, NULL, NULL, NULL, NULL, 'trigger-main-text'),
      ('trigger-extra', 1, 7, '1', NULL, 'group-1', NULL, NULL, NULL, 'trigger-extra-text');
    INSERT INTO LiveSkillEffectTarget VALUES ('target-all', 2, NULL, NULL, NULL, NULL, 'target-all-text');
  `)

  insertLanguages(
    'LangCharacter',
    'character-name',
    (locale) => `Character ${locale}`,
  )
  insertLanguages(
    'LangCharacterGrouping',
    'group-name',
    (locale) => `Group ${locale}`,
  )
  insertLanguages(
    'LangCostume',
    'costume-name',
    (locale) => `Costume ${locale}`,
  )
  insertLanguages(
    'LangGeneratedLiveSkillEffectTarget',
    'target-all-text',
    () => 'Every member',
  )
  insertLanguages(
    'LangGeneratedLivePassiveSkillEffect',
    'effect-1',
    () => 'Every member gains 15%',
  )
  insertLanguages(
    'LangGeneratedLivePassiveSkillEffect',
    'effect-2',
    () => 'Every member gains 20%',
  )
  insertLanguages(
    'LangGeneratedLivePassiveSkillEffect',
    'effect-unknown',
    () => 'Literal source',
  )
  insertLanguages(
    'LangGeneratedLiveSkillTrigger',
    'trigger-main-text',
    () => '50 combos',
  )
  insertLanguages(
    'LangGeneratedLiveSkillTrigger',
    'trigger-extra-text',
    (locale) => `1 ${`Group ${locale}`}`,
  )
})

afterEach(() => {
  database.close()
  vi.restoreAllMocks()
})

describe('live skill data transform', () => {
  it('maps costumes and independent groups, sorts composite keys, and keeps raw and parsed values', () => {
    database.exec(
      "INSERT INTO LiveSkillTrigger VALUES ('trigger-main', 2, 9, '50', NULL, NULL, NULL, NULL, NULL, 'trigger-main-text')",
    )
    const data = transformLiveSkillData(createGameDatabase(database))
    expect(data.costumes[0]).toMatchObject({
      id: 'costume-1',
      characterId: 'character-1',
      liveLeaderSkillId: 'skill-1',
      name: Object.fromEntries(
        gameLocales.map((locale) => [locale, `Costume ${locale}`]),
      ),
    })
    expect(data.leaderSkills[0]).toMatchObject({
      liveSkillTriggerGroupId: 'trigger-main',
      additionalLiveSkillTriggerGroupId: 'trigger-extra',
      livePassiveSkillEffectGroupId: 'effect-main',
      additionalLivePassiveSkillEffectGroupId: 'effect-extra',
    })
    expect(data.effects['effect-main']!.map(({ number }) => number)).toEqual([
      1, 2,
    ])
    expect(data.effects['effect-main']![0]).toMatchObject({
      value: '150',
      resourceIds: ['resource-1'],
      description: {
        params: { target: { kind: 'target', id: 'target-all' }, percent: 15 },
      },
    })
    expect(data.effects['effect-extra']![0]!.resourceIds).toBeNull()
    expect(data.effects['effect-extra']![0]!.description).toBeNull()
    expect(data.triggers['trigger-main']![0]).toMatchObject({
      threshold: '50',
      characterIds: null,
      description: { params: { threshold: 50 } },
    })
    expect(data.triggers['trigger-main']!.map(({ number }) => number)).toEqual([
      1, 2,
    ])
    expect(
      data.triggers['trigger-extra']![0]!.description?.params.group,
    ).toEqual({ kind: 'group', id: 'group-1' })
    expect(data.pendingDescriptions).toContainEqual(
      expect.objectContaining({
        table: 'LivePassiveSkillEffect',
        key: 'effect-extra:1',
        reason: 'Unknown effect type',
      }),
    )
  })

  it('retains source context for missing translations and references', () => {
    database.exec("DELETE FROM LangCostume WHERE language = 'ind'")
    expect(() => transformLiveSkillData(createGameDatabase(database))).toThrow(
      'Costume.name_lang_id in row costume-1',
    )

    database.exec(
      "INSERT INTO LangCostume VALUES ('ind', 'costume-name', 'Costume ind')",
    )
    database.exec(
      "UPDATE LivePassiveSkillEffect SET live_skill_effect_target_id = 'missing-target' WHERE group_id = 'effect-main' AND number = 1",
    )
    expect(() => transformLiveSkillData(createGameDatabase(database))).toThrow(
      'LivePassiveSkillEffect.live_skill_effect_target_id in row effect-main:1',
    )
  })

  it('keeps structured data after inference fails and uses a confirmed template on retry', () => {
    database.exec(
      "UPDATE LangGeneratedLiveSkillTrigger SET text = '1 ' || text WHERE id = 'trigger-extra-text'",
    )
    const first = transformLiveSkillData(createGameDatabase(database), {})
    expect(first.triggers['trigger-extra']![0]).toMatchObject({
      threshold: '1',
      characterGroupingId: 'group-1',
      description: null,
    })
    expect(first.pendingDescriptions).toContainEqual(
      expect.objectContaining({
        table: 'LiveSkillTrigger',
        key: 'trigger-extra:1',
        type: 7,
        language: 'jpn',
      }),
    )
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'LiveSkillTrigger trigger-extra:1 type=7 language=jpn',
      ),
    )

    const confirmed: ConfirmedDescriptionTemplates = {
      trigger: {
        7: [
          {
            parameters: ['group', 'threshold'],
            text: Object.fromEntries(
              gameLocales.map((locale) => [
                locale,
                'Confirmed: {group}, threshold {threshold}',
              ]),
            ) as Record<(typeof gameLocales)[number], string>,
          },
        ],
      },
    }
    for (const source of ['1 1 Group', 'Updated source wording']) {
      database
        .prepare(
          "UPDATE LangGeneratedLiveSkillTrigger SET text=? WHERE id='trigger-extra-text'",
        )
        .run(source)
      const next = transformLiveSkillData(
        createGameDatabase(database),
        confirmed,
      )
      const trigger = next.triggers['trigger-extra']![0]!
      expect(trigger).toMatchObject({
        threshold: '1',
        characterGroupingId: 'group-1',
      })
      expect(trigger.description).not.toBeNull()
      expect(
        next.pendingDescriptions.some(({ key }) => key === 'trigger-extra:1'),
      ).toBe(false)
      for (const locale of gameLocales) {
        expect(renderSkillDescription(trigger.description, next, locale)).toBe(
          `Confirmed: Group ${locale}, threshold 1`,
        )
      }
    }
  })

  it('keeps an unresolved generated label pending while converting other rows', () => {
    database.exec(
      "UPDATE LiveSkillTrigger SET type=12, threshold=NULL, live_note_judgement_type=3 WHERE group_id='trigger-main'",
    )
    const data = transformLiveSkillData(createGameDatabase(database))
    expect(data.triggers['trigger-main']![0]).toMatchObject({
      liveNoteJudgementType: 3,
      description: null,
    })
    expect(data.triggers['trigger-extra']![0]!.description).not.toBeNull()
    expect(data.pendingDescriptions).toContainEqual(
      expect.objectContaining({
        table: 'LiveSkillTrigger',
        key: 'trigger-main:1',
        reason: 'Cannot identify judgement label 3',
      }),
    )
  })

  it('extracts a complete attribute marker from a trigger without requiring an attribute target', () => {
    database.exec(
      "UPDATE LiveSkillTrigger SET type=8, threshold='2', card_attribute_type=1 WHERE group_id='trigger-main'",
    )
    database.exec(
      "UPDATE LangGeneratedLiveSkillTrigger SET text='[attribute=cute]Type 1[/attribute] 2 members' WHERE id='trigger-main-text'",
    )
    const data = transformLiveSkillData(createGameDatabase(database), {})
    const trigger = data.triggers['trigger-main']![0]!
    expect(trigger.description?.params).toEqual({
      attribute: { kind: 'attribute', id: 'cute' },
      threshold: 2,
    })
    expect(renderSkillDescription(trigger.description, data, 'jpn')).toBe(
      '[attribute=cute]Type 1[/attribute] 2 members',
    )
  })

  it.each([
    [
      "UPDATE LangGeneratedLivePassiveSkillEffect SET text=NULL WHERE id='effect-1' AND language='kor'",
      'Missing kor translation in LangGeneratedLivePassiveSkillEffect',
    ],
    [
      "DELETE FROM LangGeneratedLiveSkillTrigger WHERE id='trigger-main-text' AND language='ind'",
      'Missing ind translation in LangGeneratedLiveSkillTrigger',
    ],
    [
      "UPDATE LiveSkillTrigger SET character_grouping_id='missing' WHERE group_id='trigger-extra'",
      'LiveSkillTrigger.character_grouping_id in row trigger-extra:1',
    ],
    [
      "UPDATE Costume SET live_leader_skill_id='missing'",
      'Costume.live_leader_skill_id in row costume-1',
    ],
    [
      "DELETE FROM LivePassiveSkillEffect WHERE group_id='effect-main'",
      'LiveLeaderSkill.live_passive_skill_effect_group_id in row skill-1',
    ],
    [
      "UPDATE LiveSkillTrigger SET character_ids='[' WHERE group_id='trigger-main'",
      'Invalid JSON in LiveSkillTrigger.character_ids for row trigger-main:1',
    ],
  ])('reports source errors for %s', (change, message) => {
    database.exec(change)
    expect(() => transformLiveSkillData(createGameDatabase(database))).toThrow(
      message,
    )
  })
})
