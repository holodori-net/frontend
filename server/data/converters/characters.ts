import { asc, eq, sql } from 'drizzle-orm'
import type { CharacterData } from '#shared/game-data/characters.ts'
import type { LocalizedText } from '#shared/game-data/localized-text.ts'
import type { GameDatabase } from '../database.ts'
import { parseJsonArray } from '../common/json-array.ts'
import { localizedText } from '../common/localized-text.ts'
import { character, langCharacter } from '../schema/characters.ts'

export function transformCharacters(database: GameDatabase): CharacterData[] {
  const rows = database
    .select({
      id: character.id,
      nameLangId: character.nameLangId,
      shortNameLangId: character.shortNameLangId,
      characterProductionId: character.characterProductionId,
      defaultCostumeId: character.defaultCostumeId,
      defaultSdCostumeId: character.defaultSdCostumeId,
      birthMonth: character.birthMonth,
      birthDay: character.birthDay,
      debutYear: character.debutYear,
      debutMonth: character.debutMonth,
      debutDay: character.debutDay,
      fanNameLangId: character.fanNameLangId,
      descriptionLangId: character.descriptionLangId,
      commentLangId: character.commentLangId,
      youtubeUrl: character.youtubeUrl,
      xUrl: character.xUrl,
      personalityType: character.personalityType,
      sdPersonalityType: character.sdPersonalityType,
      isPlayable: character.isPlayable,
      assetId: character.assetId,
      characterLevelGroupId: character.characterLevelGroupId,
      skillTreeNodePositionGroupId: character.skillTreeNodePositionGroupId,
      isTutorial: character.isTutorial,
      dominantHandType: character.dominantHandType,
      skillTreePointId: character.skillTreePointId,
      bgmAssetId: character.bgmAssetId,
      regularCharacterGroupingNameLangId:
        character.regularCharacterGroupingNameLangId,
      color1: character.color1,
      color2: character.color2,
      color3: character.color3,
      color4: character.color4,
      color5: character.color5,
      order: character.order,
      regularCharacterGroupingIds: character.regularCharacterGroupingIds,
    })
    .from(character)
    .orderBy(asc(character.order), asc(character.id))
    .all()

  const languageQuery = database
    .select({ language: langCharacter.language, text: langCharacter.text })
    .from(langCharacter)
    .where(eq(langCharacter.id, sql.placeholder('id')))
    .prepare()
  const requiredText = (id: string, field: string, rowId: string) =>
    localizedText(languageQuery.all({ id }), id, {
      languageTable: 'LangCharacter',
      table: 'Character',
      field,
      rowId,
    })
  const optionalText = (
    id: string | null,
    field: string,
    rowId: string,
  ): LocalizedText | null =>
    id === null ? null : requiredText(id, field, rowId)

  return rows.map((row) => ({
    id: row.id,
    name: requiredText(row.nameLangId, 'name_lang_id', row.id),
    shortName: requiredText(row.shortNameLangId, 'short_name_lang_id', row.id),
    productionId: row.characterProductionId,
    birthday: { month: row.birthMonth, day: row.birthDay },
    debutDate: {
      year: row.debutYear,
      month: row.debutMonth,
      day: row.debutDay,
    },
    fanName: optionalText(row.fanNameLangId, 'fan_name_lang_id', row.id),
    description: optionalText(
      row.descriptionLangId,
      'description_lang_id',
      row.id,
    ),
    comment: optionalText(row.commentLangId, 'comment_lang_id', row.id),
    youtubeUrl: row.youtubeUrl,
    xUrl: row.xUrl,
    personalityType: row.personalityType,
    sdPersonalityType: row.sdPersonalityType,
    assetId: row.assetId,
    isPlayable: Boolean(row.isPlayable),
    regularGroupIds: parseJsonArray(row.regularCharacterGroupingIds, {
      table: 'Character',
      field: 'regular_character_grouping_ids',
      rowId: row.id,
    }),
    regularGroupName: optionalText(
      row.regularCharacterGroupingNameLangId,
      'regular_character_grouping_name_lang_id',
      row.id,
    ),
    order: row.order,
    dominantHandType: row.dominantHandType,
    isTutorial: row.isTutorial === null ? null : Boolean(row.isTutorial),
    defaultCostumeId: row.defaultCostumeId,
    defaultSdCostumeId: row.defaultSdCostumeId,
    bgmAssetId: row.bgmAssetId,
    color1: row.color1,
    color2: row.color2,
    color3: row.color3,
    color4: row.color4,
    color5: row.color5,
    growth: {
      levelGroupId: row.characterLevelGroupId,
      skillTreeNodePositionGroupId: row.skillTreeNodePositionGroupId,
      skillTreePointId: row.skillTreePointId,
    },
  }))
}
