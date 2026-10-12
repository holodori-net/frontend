import type { DatabaseSync } from 'node:sqlite'
import type { CharacterData } from '#shared/game-data/characters'
import type { LocalizedText } from '#shared/game-data/localized-text'
import { parseJsonArray } from '../common/json-array.ts'
import { localizedText } from '../common/localized-text.ts'

type CharacterRow = {
  id: string
  name_lang_id: string
  short_name_lang_id: string
  character_production_id: string | null
  default_costume_id: string
  default_sd_costume_id: string
  birth_month: number
  birth_day: number
  debut_year: number
  debut_month: number
  debut_day: number
  fan_name_lang_id: string | null
  description_lang_id: string | null
  comment_lang_id: string | null
  youtube_url: string | null
  x_url: string | null
  personality_type: number | null
  sd_personality_type: number | null
  is_playable: number | null
  asset_id: string | null
  character_level_group_id: string | null
  skill_tree_node_position_group_id: string | null
  is_tutorial: number | null
  dominant_hand_type: number
  skill_tree_point_id: string | null
  bgm_asset_id: string | null
  regular_character_grouping_name_lang_id: string | null
  color1: string | null
  color2: string | null
  color3: string | null
  color4: string | null
  color5: string | null
  order: number
  regular_character_grouping_ids: string | null
}

export function transformCharacters(database: DatabaseSync): CharacterData[] {
  const rows = database
    .prepare(
      `SELECT id, name_lang_id, short_name_lang_id, character_production_id,
              default_costume_id, default_sd_costume_id, birth_month, birth_day,
              debut_year, debut_month, debut_day, fan_name_lang_id,
              description_lang_id, comment_lang_id, youtube_url, x_url,
              personality_type, sd_personality_type, is_playable, asset_id,
              character_level_group_id, skill_tree_node_position_group_id,
              is_tutorial, dominant_hand_type, skill_tree_point_id, bgm_asset_id,
              regular_character_grouping_name_lang_id, color1, color2, color3,
              color4, color5, "order", regular_character_grouping_ids
       FROM Character ORDER BY "order", id`,
    )
    .all() as CharacterRow[]

  const languageStatement = database.prepare(
    'SELECT language, text FROM LangCharacter WHERE id = ?',
  )
  const requiredText = (id: string, field: string, rowId: string) =>
    localizedText(languageStatement, id, {
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
    name: requiredText(row.name_lang_id, 'name_lang_id', row.id),
    shortName: requiredText(
      row.short_name_lang_id,
      'short_name_lang_id',
      row.id,
    ),
    productionId: row.character_production_id,
    birthday: { month: row.birth_month, day: row.birth_day },
    debutDate: {
      year: row.debut_year,
      month: row.debut_month,
      day: row.debut_day,
    },
    fanName: optionalText(row.fan_name_lang_id, 'fan_name_lang_id', row.id),
    description: optionalText(
      row.description_lang_id,
      'description_lang_id',
      row.id,
    ),
    comment: optionalText(row.comment_lang_id, 'comment_lang_id', row.id),
    youtubeUrl: row.youtube_url,
    xUrl: row.x_url,
    personalityType: row.personality_type,
    sdPersonalityType: row.sd_personality_type,
    assetId: row.asset_id,
    isPlayable: Boolean(row.is_playable),
    regularGroupIds: parseJsonArray(row.regular_character_grouping_ids, {
      table: 'Character',
      field: 'regular_character_grouping_ids',
      rowId: row.id,
    }),
    regularGroupName: optionalText(
      row.regular_character_grouping_name_lang_id,
      'regular_character_grouping_name_lang_id',
      row.id,
    ),
    order: row.order,
    dominantHandType: row.dominant_hand_type,
    isTutorial: row.is_tutorial === null ? null : Boolean(row.is_tutorial),
    defaultCostumeId: row.default_costume_id,
    defaultSdCostumeId: row.default_sd_costume_id,
    bgmAssetId: row.bgm_asset_id,
    color1: row.color1,
    color2: row.color2,
    color3: row.color3,
    color4: row.color4,
    color5: row.color5,
    growth: {
      levelGroupId: row.character_level_group_id,
      skillTreeNodePositionGroupId: row.skill_tree_node_position_group_id,
      skillTreePointId: row.skill_tree_point_id,
    },
  }))
}
