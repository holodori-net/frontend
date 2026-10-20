import { eq, sql } from 'drizzle-orm'
import type { LocalizedText } from '#shared/game-data/localized-text.ts'
import { localizedText } from '../common/localized-text.ts'
import type { GameDatabase } from '../database.ts'
import type { langCharacter } from '../schema/characters.ts'
import type { langCharacterGrouping } from '../schema/character-groups.ts'
import type {
  langGeneratedLiveActiveSkillEffect,
  langGeneratedLivePassiveSkillLevel,
  langGeneratedLiveActiveSkillLevel,
  langGeneratedLiveSpecialSkillLevel,
} from '../schema/card-skills.ts'
import type {
  langCostume,
  langGeneratedLivePassiveSkillEffect,
  langGeneratedLiveSkillTrigger,
} from '../schema/live-skills.ts'
import type { langGeneratedLiveSkillEffectTarget } from '../schema/live-skill-effect-targets.ts'

export function sourceText(
  rows: { language: string; text: string | null }[],
  id: string,
  languageTable: string,
  table: string,
  field: string,
  rowId: string,
): LocalizedText {
  return localizedText(rows, id, { languageTable, table, field, rowId })
}

export function makeTextQuery(
  database: GameDatabase,
  table:
    | typeof langCostume
    | typeof langCharacter
    | typeof langCharacterGrouping
    | typeof langGeneratedLivePassiveSkillEffect
    | typeof langGeneratedLiveSkillTrigger
    | typeof langGeneratedLiveSkillEffectTarget
    | typeof langGeneratedLivePassiveSkillLevel
    | typeof langGeneratedLiveActiveSkillLevel
    | typeof langGeneratedLiveSpecialSkillLevel
    | typeof langGeneratedLiveActiveSkillEffect,
) {
  return database
    .select({ language: table.language, text: table.text })
    .from(table)
    .where(eq(table.id, sql.placeholder('id')))
    .prepare()
}
