import { existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it, vi } from 'vitest'
import { gameLocales, type GameLocale } from '../../shared/language.ts'
import {
  composePassiveSkillDescription,
  composeActiveSkillDescription,
  composeSpecialSkillDescription,
  renderSkillDescription,
} from '../../shared/game-data/live-skill-description.ts'
import { createGameDatabase } from '../../server/data/database.ts'
import { transformCards } from '../../server/data/converters/cards.ts'
import { transformCardSkillData } from '../../server/data/converters/card-skills.ts'

const sourcePath = new URL('../../.data/master.sqlite', import.meta.url)
const normalize = (text: string) => text.replace(/\[\/?highlight\]/g, '').trim()

describe.skipIf(!existsSync(sourcePath))('local master card skills', () => {
  it.each(['automatic', 'confirmed'] as const)(
    'renders every effect and skill level in six languages using %s templates',
    (mode) => {
      const database = new DatabaseSync(sourcePath, { readOnly: true })
      const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const gameDatabase = createGameDatabase(database)
        const data = transformCardSkillData(
          gameDatabase,
          mode === 'automatic' ? {} : undefined,
        )
        const sources = database
          .prepare(
            `
          SELECT effect.group_id, effect.number, translation.language, translation.text
          FROM LiveActiveSkillEffect effect
          JOIN LangGeneratedLiveActiveSkillEffect translation
            ON effect.description_lang_id = translation.id
        `,
          )
          .all()
        const effects = Object.values(data.activeEffects).flat()
        expect(sources).toHaveLength(effects.length * gameLocales.length)
        for (const effect of effects) {
          expect(effect.description).not.toBeNull()
          expect(
            data.catalog.templates[effect.description!.templateId]?.domain,
          ).toBe('activeEffect')
          for (const locale of gameLocales) {
            const text = renderSkillDescription(
              effect.description,
              data,
              locale,
            )
            expect(text).toEqual(expect.any(String))
            expect(text).not.toContain('[highlight]')
            if (mode === 'automatic') {
              const source = sources.find(
                (row) =>
                  row.group_id === effect.groupId &&
                  row.number === effect.number &&
                  row.language === locale,
              )!
              expect(
                normalize(text!),
                `${effect.groupId}:${effect.number} ${locale}`,
              ).toBe(normalize(String(source.text)))
            }
          }
        }

        const domains: {
          table: string
          field: string
          groups: Record<string, readonly { level: number }[]>
          levels: {
            id: string
            level: number
            compose: (locale: GameLocale) => string | null
          }[]
        }[] = [
          {
            table: 'LivePassiveSkill',
            field: 'live_passive_skill_id',
            groups: data.passiveSkills,
            levels: Object.values(data.passiveSkills)
              .flat()
              .map((skill) => ({
                id: skill.livePassiveSkillId,
                level: skill.level,
                compose: (locale: GameLocale) =>
                  composePassiveSkillDescription(skill, data, locale),
              })),
          },
          {
            table: 'LiveActiveSkill',
            field: 'live_active_skill_id',
            groups: data.activeSkills,
            levels: Object.values(data.activeSkills)
              .flat()
              .map((skill) => ({
                id: skill.liveActiveSkillId,
                level: skill.level,
                compose: (locale: GameLocale) =>
                  composeActiveSkillDescription(skill, data, locale),
              })),
          },
          {
            table: 'LiveSpecialSkill',
            field: 'live_special_skill_id',
            groups: data.specialSkills,
            levels: Object.values(data.specialSkills)
              .flat()
              .map((skill) => ({
                id: skill.liveSpecialSkillId,
                level: skill.level,
                compose: (locale: GameLocale) =>
                  composeSpecialSkillDescription(skill, data, locale),
              })),
          },
        ]
        let complete = 0
        for (const domain of domains) {
          const sourceRows = database
            .prepare(
              `
            SELECT skill.${domain.field} AS id, skill.level, translation.language, translation.text
            FROM ${domain.table}Level skill
            JOIN LangGenerated${domain.table}Level translation
              ON skill.description_lang_id = translation.id
          `,
            )
            .all()
          const sourceTexts = new Map(
            sourceRows.map((row) => [
              `${row.id}:${row.level}:${row.language}`,
              String(row.text),
            ]),
          )
          expect(sourceRows).toHaveLength(
            domain.levels.length * gameLocales.length,
          )
          const ids = database.prepare(`SELECT id FROM ${domain.table}`).all()
          expect(Object.keys(domain.groups).sort()).toEqual(
            ids.map((row) => row.id).sort(),
          )
          for (const rows of Object.values(domain.groups)) {
            expect(rows.map(({ level }) => level)).toEqual(
              rows.map(({ level }) => level).sort((a, b) => a - b),
            )
          }
          for (const skill of domain.levels) {
            for (const locale of gameLocales) {
              const key = `${skill.id}:${skill.level}:${locale}`
              const text = skill.compose(locale)
              expect(text, key).toEqual(expect.any(String))
              expect(text, key).not.toContain('[highlight]')
              if (mode === 'automatic')
                expect(normalize(text!), key).toBe(
                  normalize(sourceTexts.get(key)!),
                )
              complete++
            }
          }
        }

        const cards = transformCards(gameDatabase)
        for (const card of cards) {
          expect(data.passiveSkills[card.livePassiveSkillId]).toBeDefined()
          expect(data.activeSkills[card.liveActiveSkillId]).toBeDefined()
          expect(data.specialSkills[card.liveSpecialSkillId]).toBeDefined()
        }
        const referencedActiveIds = new Set(
          cards.map((card) => card.liveActiveSkillId),
        )
        const unreferenced = database
          .prepare(
            `
          SELECT id FROM LiveActiveSkill
          WHERE id NOT IN (SELECT live_active_skill_id FROM Card)
        `,
          )
          .all()
        expect(
          Object.keys(data.activeSkills)
            .filter((id) => !referencedActiveIds.has(id))
            .sort(),
        ).toEqual(unreferenced.map((row) => row.id).sort())
        expect(data.pendingDescriptions).toEqual([
          expect.objectContaining({
            table: 'LiveSkillEffectTarget',
            key: 'live_skill_effect_target-character_grouping-grp-indonesia',
          }),
        ])
        expect(warnings).toHaveBeenCalledTimes(data.pendingDescriptions.length)
        console.info(
          `[card-skills master] ${mode}: activeEffects=${effects.length}, effectDescriptions=${sources.length}, complete=${complete}, unreferencedActive=${unreferenced.length}, templates=${Object.keys(data.catalog.templates).length}, pending=${JSON.stringify(data.pendingDescriptions)}`,
        )
      } finally {
        warnings.mockRestore()
        database.close()
      }
    },
  )
})
