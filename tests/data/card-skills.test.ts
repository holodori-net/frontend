import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gameLocales } from '../../shared/language.ts'
import { createGameDatabase } from '../../server/data/database.ts'
import { transformCardSkillData } from '../../server/data/converters/card-skills.ts'

let database: DatabaseSync

function addTranslations(
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
    CREATE TABLE LiveSkillEffectTarget (id TEXT PRIMARY KEY, type INTEGER NOT NULL, target_count INTEGER, character_id TEXT, character_grouping_id TEXT, card_attribute_type INTEGER, description_lang_id TEXT NOT NULL);
    CREATE TABLE LangGeneratedLiveSkillEffectTarget (language TEXT, id TEXT, text TEXT, PRIMARY KEY(language, id));
    CREATE TABLE LivePassiveSkillEffect (group_id TEXT, number INTEGER, type INTEGER NOT NULL, value TEXT, live_skill_effect_target_id TEXT, resource_type INTEGER, resource_ids TEXT, description_lang_id TEXT NOT NULL, PRIMARY KEY(group_id, number));
    CREATE TABLE LangGeneratedLivePassiveSkillEffect (language TEXT, id TEXT, text TEXT, PRIMARY KEY(language, id));
    CREATE TABLE LiveSkillTrigger (group_id TEXT, number INTEGER, type INTEGER NOT NULL, threshold TEXT, character_ids TEXT, character_grouping_id TEXT, music_id TEXT, card_attribute_type INTEGER, live_note_judgement_type INTEGER, description_lang_id TEXT NOT NULL, PRIMARY KEY(group_id, number));
    CREATE TABLE LangGeneratedLiveSkillTrigger (language TEXT, id TEXT, text TEXT, PRIMARY KEY(language, id));
    CREATE TABLE LivePassiveSkill (id TEXT PRIMARY KEY);
    CREATE TABLE LivePassiveSkillLevel (live_passive_skill_id TEXT, level INTEGER, live_skill_trigger_group_id TEXT, live_passive_skill_effect_group_id TEXT, additional_live_skill_trigger_group_id TEXT, additional_live_passive_skill_effect_group_id TEXT, description_lang_id TEXT, PRIMARY KEY(live_passive_skill_id, level));
    CREATE TABLE LangGeneratedLivePassiveSkillLevel (language TEXT, id TEXT, text TEXT, PRIMARY KEY(language, id));
    CREATE TABLE LiveActiveSkill (id TEXT PRIMARY KEY);
    CREATE TABLE LiveActiveSkillLevel (live_active_skill_id TEXT, level INTEGER, live_skill_trigger_group_id TEXT, live_active_skill_effect_group_id TEXT, additional_live_skill_trigger_group_id TEXT, additional_live_active_skill_effect_group_id TEXT, cool_time_millisecond INTEGER, activation_probability_permil_multiply INTEGER, limit_count INTEGER, effect_duration_millisecond INTEGER, description_lang_id TEXT, PRIMARY KEY(live_active_skill_id, level));
    CREATE TABLE LangGeneratedLiveActiveSkillLevel (language TEXT, id TEXT, text TEXT, PRIMARY KEY(language, id));
    CREATE TABLE LiveSpecialSkill (id TEXT PRIMARY KEY);
    CREATE TABLE LiveSpecialSkillLevel (live_special_skill_id TEXT, level INTEGER, live_active_skill_effect_group_id TEXT, additional_live_skill_trigger_group_id TEXT, additional_live_active_skill_effect_group_id TEXT, effect_duration_millisecond INTEGER, description_lang_id TEXT, PRIMARY KEY(live_special_skill_id, level));
    CREATE TABLE LangGeneratedLiveSpecialSkillLevel (language TEXT, id TEXT, text TEXT, PRIMARY KEY(language, id));
    CREATE TABLE LiveActiveSkillEffect (group_id TEXT, number INTEGER, type INTEGER, value TEXT, score_up_based_on_parameter_permil_multiply INTEGER, description_lang_id TEXT, PRIMARY KEY(group_id, number));
    CREATE TABLE LangGeneratedLiveActiveSkillEffect (language TEXT, id TEXT, text TEXT, PRIMARY KEY(language, id));

    INSERT INTO LivePassiveSkill VALUES ('passive-1');
    INSERT INTO LivePassiveSkillLevel VALUES
      ('passive-1', 2, NULL, 'passive-effects', NULL, NULL, 'passive-level-2'),
      ('passive-1', 1, NULL, 'passive-effects', NULL, NULL, 'passive-level-1');
    INSERT INTO LiveActiveSkill VALUES ('active-unreferenced');
    INSERT INTO LiveActiveSkillLevel VALUES
      ('active-unreferenced', 2, NULL, 'active-effects', NULL, NULL, 17000, 370, NULL, 6000, 'active-level-2'),
      ('active-unreferenced', 1, NULL, 'active-effects', NULL, NULL, 18000, 460, 2, 5000, 'active-level-1'),
      ('active-unreferenced', 3, NULL, 'amount-effects', NULL, NULL, 10000, 999, NULL, 5000, 'active-level-3');
    INSERT INTO LiveSpecialSkill VALUES ('special-1');
    INSERT INTO LiveSpecialSkillLevel VALUES
      ('special-1', 1, 'fixed-effects', NULL, NULL, 8000, 'special-level-1');
    INSERT INTO LivePassiveSkillEffect VALUES ('passive-effects', 1, 8, '150', NULL, NULL, NULL, 'passive-effect');
    INSERT INTO LiveActiveSkillEffect VALUES
      ('active-effects', 1, 1, '400', NULL, 'active-effect'),
      ('active-effects', 2, 99, NULL, NULL, 'unknown-effect'),
      ('active-type-5', 1, 5, '300', NULL, 'active-effect-5'),
      ('fixed-effects', 1, 9, NULL, NULL, 'fixed-effect'),
      ('amount-effects', 1, 8, '100', NULL, 'amount-effect');
    INSERT INTO LivePassiveSkillEffect VALUES ('passive-effects', 2, 5, '300', 'target-all', NULL, NULL, 'passive-effect-5');
    INSERT INTO LiveSkillEffectTarget VALUES ('target-all', 2, NULL, NULL, NULL, NULL, 'target-all-text');
  `)
  addTranslations(
    'LangGeneratedLivePassiveSkillLevel',
    'passive-level-1',
    () => 'Passive level 1',
  )
  addTranslations(
    'LangGeneratedLivePassiveSkillLevel',
    'passive-level-2',
    () => 'Passive level 2',
  )
  addTranslations(
    'LangGeneratedLiveActiveSkillLevel',
    'active-level-1',
    () => 'Active level 1',
  )
  addTranslations(
    'LangGeneratedLiveActiveSkillLevel',
    'active-level-2',
    () => 'Active level 2',
  )
  addTranslations(
    'LangGeneratedLiveActiveSkillLevel',
    'active-level-3',
    () => 'Active level 3',
  )
  addTranslations(
    'LangGeneratedLiveSpecialSkillLevel',
    'special-level-1',
    () => 'Special level 1',
  )
  addTranslations(
    'LangGeneratedLivePassiveSkillEffect',
    'passive-effect',
    () => '150%',
  )
  addTranslations(
    'LangGeneratedLivePassiveSkillEffect',
    'passive-effect-5',
    (locale) =>
      ({
        jpn: '全員のテクニックが30%UP',
        eng: 'Grants Technique UP 30% to all.',
        ind: 'Teknik Naik 30% untuk Setiap Member',
        kor: '전원의 테크닉이 30% UP',
        cht: '全體成員的技巧提升30%',
        chs: '全体成员中技巧提升30%',
      })[locale as (typeof gameLocales)[number]]!,
  )
  addTranslations(
    'LangGeneratedLiveSkillEffectTarget',
    'target-all-text',
    (locale) =>
      ({
        jpn: '全員の',
        eng: 'all',
        ind: 'Setiap Member',
        kor: '전원의',
        cht: '全體成員的',
        chs: '全体成员中',
      })[locale as (typeof gameLocales)[number]]!,
  )
  addTranslations(
    'LangGeneratedLiveActiveSkillEffect',
    'active-effect',
    (locale) =>
      ({
        jpn: 'スコアが40%UP',
        eng: 'Score UP 40%.',
        ind: 'Skor Naik 40%',
        kor: '스코어가 40% UP',
        cht: '分數提升40%',
        chs: '得分提升40%',
      })[locale as (typeof gameLocales)[number]]!,
  )
  addTranslations(
    'LangGeneratedLiveActiveSkillEffect',
    'active-effect-5',
    (locale) =>
      ({
        jpn: 'スコアサポート効果30%',
        eng: 'Grants Score Support Effect of 30%.',
        ind: 'Efek Score Support meningkat 30%',
        kor: '스코어 서포트 효과 30%',
        cht: '分數加成效果30%',
        chs: '得分辅助效果30%',
      })[locale as (typeof gameLocales)[number]]!,
  )
  addTranslations(
    'LangGeneratedLiveActiveSkillEffect',
    'fixed-effect',
    (locale) =>
      ({
        jpn: 'GOOD以上がPERFECTになる',
        eng: 'GOOD or higher becomes PERFECT.',
        ind: 'Diatas GOOD menjadi PERFECT',
        kor: 'GOOD 이상이 PERFECT가 된다',
        cht: 'GOOD以上判定為PERFECT',
        chs: 'GOOD以上变为PERFECT',
      })[locale as (typeof gameLocales)[number]]!,
  )
  addTranslations(
    'LangGeneratedLiveActiveSkillEffect',
    'unknown-effect',
    () => 'Unrecognized effect',
  )
  addTranslations(
    'LangGeneratedLiveActiveSkillEffect',
    'amount-effect',
    (locale) =>
      ({
        jpn: 'ライフが100回復',
        eng: 'Restores 100 LIFE.',
        ind: 'Pemulihan LIFE 100',
        kor: '라이프가 100 회복',
        cht: '生命值回復100',
        chs: '生命值恢复100点',
      })[locale as (typeof gameLocales)[number]]!,
  )
})

afterEach(() => {
  database.close()
  vi.restoreAllMocks()
})

describe('card skill data transform', () => {
  it('loads every level, preserves source fields, and groups effects including unreferenced skills', () => {
    const data = transformCardSkillData(createGameDatabase(database))

    expect(data.passiveSkills['passive-1']?.map(({ level }) => level)).toEqual([
      1, 2,
    ])
    expect(
      data.activeSkills['active-unreferenced']?.map(({ level }) => level),
    ).toEqual([1, 2, 3])
    expect(data.activeSkills['active-unreferenced']?.[1]).toMatchObject({
      limitCount: null,
    })
    expect(data.activeSkills['active-unreferenced']?.[2]).toMatchObject({
      coolTimeMillisecond: 10000,
      activationProbabilityPermilMultiply: 999,
      effectDurationMillisecond: 5000,
    })
    expect(data.activeSkills['active-unreferenced']?.[0]).toMatchObject({
      liveActiveSkillId: 'active-unreferenced',
      coolTimeMillisecond: 18000,
      activationProbabilityPermilMultiply: 460,
      limitCount: 2,
      effectDurationMillisecond: 5000,
    })
    expect(
      data.specialSkills['special-1']?.[0]?.effectDurationMillisecond,
    ).toBe(8000)
    expect(data.activeEffects['active-effects']?.[0]).toMatchObject({
      value: '400',
      description: { params: { percent: 40 } },
    })
    expect(
      data.activeEffects['fixed-effects']?.[0]?.description?.params,
    ).toEqual({})
    expect(data.activeEffects['amount-effects']?.[0]).toMatchObject({
      value: '100',
      description: { params: { amount: '100' } },
    })
    expect(data.activeEffects['active-effects']?.[1]?.description).toBeNull()
    expect(data.pendingDescriptions).toContainEqual(
      expect.objectContaining({
        table: 'LiveActiveSkillEffect',
        key: 'active-effects:2',
        reason: 'Unknown active effect type',
      }),
    )
    const scoreTemplateId =
      data.activeEffects['active-effects']![0]!.description!.templateId
    expect(data.catalog.templates[scoreTemplateId]).toMatchObject({
      domain: 'activeEffect',
      type: 1,
    })
    const passiveTechniqueTemplateId =
      data.effects['passive-effects']![1]!.description!.templateId
    const activeSupportTemplateId =
      data.activeEffects['active-type-5']![0]!.description!.templateId
    expect(data.catalog.templates[passiveTechniqueTemplateId]).toMatchObject({
      domain: 'effect',
      type: 5,
    })
    expect(data.catalog.templates[activeSupportTemplateId]).toMatchObject({
      domain: 'activeEffect',
      type: 5,
    })
    expect(data.pendingDescriptions).toContainEqual(
      expect.objectContaining({
        table: 'LiveActiveSkillLevel',
        key: 'active-unreferenced:3',
        type: null,
        language: 'jpn',
        reason: '卡片主動技能發動機率尚未確認',
      }),
    )
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'LiveActiveSkillLevel active-unreferenced:3 type=null language=jpn',
      ),
    )
    expect(data.catalog.labels.probability).toMatchObject({
      '370': { eng: 'Low Probability', cht: '低機率' },
      '460': { eng: 'Medium Probability', cht: '中機率' },
      '550': { eng: 'High Probability', cht: '高機率' },
    })
  })

  it('reports missing level translations and effect group references with source context', () => {
    database.exec(
      "DELETE FROM LangGeneratedLiveActiveSkillLevel WHERE id='active-level-2' AND language='ind'",
    )
    expect(() => transformCardSkillData(createGameDatabase(database))).toThrow(
      'LiveActiveSkillLevel.description_lang_id in row live_active_skill_id=active-unreferenced level=2',
    )

    database.exec(
      "INSERT INTO LangGeneratedLiveActiveSkillLevel VALUES ('ind', 'active-level-2', 'Active level 2')",
    )
    database.exec(
      "UPDATE LivePassiveSkillLevel SET live_passive_skill_effect_group_id='missing-effects' WHERE level=1",
    )
    expect(() => transformCardSkillData(createGameDatabase(database))).toThrow(
      'LivePassiveSkillLevel.live_passive_skill_effect_group_id in row passive-1 level=1',
    )
  })

  it('uses confirmed active-effect templates and infers changed source wording', () => {
    const customText = Object.fromEntries(
      gameLocales.map((locale) => [locale, `Confirmed {percent} (${locale})`]),
    ) as Record<(typeof gameLocales)[number], string>
    const confirmed = {
      activeEffect: {
        1: [{ parameters: ['percent'], text: customText }],
      },
    }
    const confirmedData = transformCardSkillData(
      createGameDatabase(database),
      confirmed,
    )
    const confirmedDescription =
      confirmedData.activeEffects['active-effects']![0]!.description!
    expect(
      confirmedData.catalog.templates[confirmedDescription.templateId]!.text,
    ).toEqual(customText)

    const sourceByLocale = {
      jpn: 'スコアが[highlight]40%[/highlight]UP',
      eng: 'A score increase of [highlight]40%[/highlight].',
      ind: 'Skor Naik [highlight]40%[/highlight]',
      kor: '스코어가 [highlight]40%[/highlight] UP',
      cht: '分數提升[highlight]40%[/highlight]',
      chs: '得分提升[highlight]40%[/highlight]',
    }
    for (const [locale, text] of Object.entries(sourceByLocale)) {
      database
        .prepare(
          "UPDATE LangGeneratedLiveActiveSkillEffect SET text=? WHERE id='active-effect' AND language=?",
        )
        .run(text, locale)
    }
    const confirmedAfterSourceChange = transformCardSkillData(
      createGameDatabase(database),
      confirmed,
    )
    const confirmedAfterSourceChangeId =
      confirmedAfterSourceChange.activeEffects['active-effects']![0]!
        .description!.templateId
    expect(
      confirmedAfterSourceChange.catalog.templates[
        confirmedAfterSourceChangeId
      ]!.text,
    ).toEqual(customText)

    const inferredData = transformCardSkillData(createGameDatabase(database), {
      activeEffect: {},
    })
    const inferredDescription =
      inferredData.activeEffects['active-effects']![0]!.description!
    expect(
      inferredData.catalog.templates[inferredDescription.templateId]!.text.eng,
    ).toBe('A score increase of {percent}%.')
    expect(
      Object.values(
        inferredData.catalog.templates[inferredDescription.templateId]!.text,
      ).some((text) => text.includes('[highlight]')),
    ).toBe(false)
  })

  it('throws source context for missing active-effect translations and owner references', () => {
    database.exec(
      "DELETE FROM LangGeneratedLiveActiveSkillEffect WHERE id='active-effect' AND language='ind'",
    )
    expect(() => transformCardSkillData(createGameDatabase(database))).toThrow(
      'LiveActiveSkillEffect.description_lang_id in row active-effects:1',
    )

    database.exec(
      "INSERT INTO LangGeneratedLiveActiveSkillEffect VALUES ('ind', 'active-effect', 'Skor Naik 40%')",
    )
    database.exec(
      "UPDATE LiveActiveSkillLevel SET live_active_skill_id='missing-skill' WHERE level=1",
    )
    expect(() => transformCardSkillData(createGameDatabase(database))).toThrow(
      'LiveActiveSkillLevel.live_active_skill_id in row missing-skill level=1',
    )
  })

  it('keeps main and additional groups independent and sorts composite effect keys', () => {
    database.exec(`
      UPDATE LivePassiveSkillLevel
      SET live_skill_trigger_group_id='passive-trigger-main',
          additional_live_skill_trigger_group_id='passive-trigger-additional',
          additional_live_passive_skill_effect_group_id='passive-effects-additional'
      WHERE live_passive_skill_id='passive-1' AND level=1;
      INSERT INTO LivePassiveSkillEffect VALUES
        ('passive-effects-additional', 1, 8, '150', NULL, NULL, NULL, 'passive-effect-additional');
      INSERT INTO LiveSkillTrigger VALUES
        ('passive-trigger-main', 1, 99, NULL, NULL, NULL, NULL, NULL, NULL, 'trigger-main'),
        ('passive-trigger-additional', 1, 99, NULL, NULL, NULL, NULL, NULL, NULL, 'trigger-additional');
    `)
    addTranslations(
      'LangGeneratedLivePassiveSkillEffect',
      'passive-effect-additional',
      () => '150%',
    )
    addTranslations(
      'LangGeneratedLiveSkillTrigger',
      'trigger-main',
      () => 'literal main',
    )
    addTranslations(
      'LangGeneratedLiveSkillTrigger',
      'trigger-additional',
      () => 'literal additional',
    )

    const data = transformCardSkillData(createGameDatabase(database))
    expect(data.passiveSkills['passive-1']![0]).toMatchObject({
      liveSkillTriggerGroupId: 'passive-trigger-main',
      livePassiveSkillEffectGroupId: 'passive-effects',
      additionalLiveSkillTriggerGroupId: 'passive-trigger-additional',
      additionalLivePassiveSkillEffectGroupId: 'passive-effects-additional',
    })
    expect(Object.keys(data.activeEffects)).toEqual([
      'active-effects',
      'active-type-5',
      'amount-effects',
      'fixed-effects',
    ])
    expect(
      data.activeEffects['active-effects']?.map(({ number }) => number),
    ).toEqual([1, 2])
  })
})
