import { existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it, vi } from 'vitest'
import { gameLocales } from '../../shared/language.ts'
import {
  composeCostumeSkillDescription,
  renderSkillDescription,
} from '../../shared/game-data/live-skill-description.ts'
import { createGameDatabase } from '../../server/data/database.ts'
import { transformLiveSkillData } from '../../server/data/converters/live-skills.ts'

const sourcePath = new URL('../../.data/master.sqlite', import.meta.url)

describe.skipIf(!existsSync(sourcePath))(
  'local master live skill descriptions',
  () => {
    it.each(['automatic', 'confirmed'] as const)(
      'renders all six-language costume skills using %s templates and verifies automatic source restoration',
      (mode) => {
        const database = new DatabaseSync(sourcePath, { readOnly: true })
        const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
          const data = transformLiveSkillData(
            createGameDatabase(database),
            mode === 'automatic' ? {} : undefined,
          )
          const domains = [
            { table: 'LiveSkillEffectTarget', rows: data.targets },
            {
              table: 'LivePassiveSkillEffect',
              rows: Object.values(data.effects).flat(),
            },
            {
              table: 'LiveSkillTrigger',
              rows: Object.values(data.triggers).flat(),
            },
          ] as const
          let rendered = 0
          let sourceMatches = 0
          for (const domain of domains) {
            const sources = database
              .prepare(
                `
          SELECT source.*, translation.language, translation.text
          FROM ${domain.table} source
          JOIN LangGenerated${domain.table} translation
            ON source.description_lang_id = translation.id
        `,
              )
              .all()
            expect(sources).toHaveLength(
              domain.rows.length * gameLocales.length,
            )
            for (const row of domain.rows) {
              const key = 'id' in row ? row.id : `${row.groupId}:${row.number}`
              for (const locale of gameLocales) {
                const source = sources.find(
                  (source) =>
                    source.language === locale &&
                    ('id' in row
                      ? source.id === row.id
                      : source.group_id === row.groupId &&
                        source.number === row.number),
                )!
                if (row.description === null) {
                  expect(
                    data.pendingDescriptions,
                    `${domain.table} ${key}`,
                  ).toContainEqual(
                    expect.objectContaining({ table: domain.table, key }),
                  )
                } else {
                  const text = renderSkillDescription(
                    row.description,
                    data,
                    locale,
                  )
                  expect(text, `${domain.table} ${key} ${locale}`).toEqual(
                    expect.any(String),
                  )
                  if (mode === 'automatic')
                    expect(text, `${domain.table} ${key} ${locale}`).toBe(
                      source.text,
                    )
                  if (text === source.text) sourceMatches++
                  rendered++
                }
              }
            }
          }
          expect(data.pendingDescriptions).toEqual([
            expect.objectContaining({
              table: 'LiveSkillEffectTarget',
              key: 'live_skill_effect_target-character_grouping-grp-indonesia',
              type: 4,
            }),
          ])
          expect(warnings).toHaveBeenCalledTimes(
            data.pendingDescriptions.length,
          )

          const complete = database
            .prepare(
              `
        SELECT skill.id, translation.language, translation.text
        FROM LiveLeaderSkill skill
        JOIN LangGeneratedLiveLeaderSkill translation ON skill.description_lang_id = translation.id
      `,
            )
            .all()
          expect(complete).toHaveLength(
            data.leaderSkills.length * gameLocales.length,
          )
          for (const skill of data.leaderSkills) {
            for (const locale of gameLocales) {
              const source = complete.find(
                (row) => row.id === skill.id && row.language === locale,
              )!
              const text = composeCostumeSkillDescription(skill, data, locale)
              expect(text, `${skill.id} ${locale}`).toEqual(expect.any(String))
              if (mode === 'automatic')
                expect(text, `${skill.id} ${locale}`).toBe(
                  String(source.text).trim(),
                )
            }
          }
          expect(data.pendingDescriptions).toHaveLength(1)
          console.info(
            `[live-skill master] ${mode}: rendered=${rendered}, sourceMatches=${sourceMatches}, complete=${complete.length}, templates=${Object.keys(data.catalog.templates).length}, pending=${JSON.stringify(data.pendingDescriptions)}`,
          )
        } finally {
          warnings.mockRestore()
          database.close()
        }
      },
    )
  },
)
