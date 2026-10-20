# 服裝與 Live 服裝技能資料字典

`transformLiveSkillData(database)` 回傳 `LiveSkillData`，包含 `costumes`、`leaderSkills`、依 `groupId` 分組的 `effects` 與 `triggers`、`targets`、共用 `catalog` 與 `pendingDescriptions`。各組依來源 `number` 排序。型別位於 [live-skills.ts](../../shared/game-data/live-skills.ts)，轉換位於 [live-skills.ts](../../server/data/converters/live-skills.ts)。

以下欄位型別、主鍵與轉換為 **CONFIRMED**，由本機 SQLite `PRAGMA table_info` 及轉換程式確認。`✓` 表示已轉換。關聯不等同 SQLite 外鍵約束。卡片保留 `rewardCostumeId: string | null`，角色預設服裝仍由 `Character.defaultCostumeId` 關聯。

## Costume

主鍵為 `id`。`transformCostumes(database)` 僅查詢名稱與技能關聯所需欄位。

| 轉換 | 來源欄位                        | 型別        | 回傳對應／用途                                                |
| ---- | ------------------------------- | ----------- | ------------------------------------------------------------- |
| ✓    | `id`                            | TEXT        | `costumes[].id`                                               |
| ✓    | `character_id`                  | TEXT        | `characterId`，關聯 `Character.id`                            |
| ✓    | `name_lang_id`                  | TEXT        | 查 `LangCostume.id` 取得六語 `name`                           |
| ✓    | `live_leader_skill_id`          | TEXT / null | `liveLeaderSkillId`，關聯 `LiveLeaderSkill.id`；null 原樣保留 |
|      | `asset_id`                      | TEXT        | 服裝素材 ID                                                   |
|      | `expression_asset_id`           | TEXT        | 表情素材 ID                                                   |
|      | `live_start_character_voice_id` | TEXT / null | Live 開始角色語音 ID                                          |
|      | `rarity_type`                   | INTEGER     | 服裝稀有度                                                    |
|      | `order`                         | INTEGER     | 來源排序                                                      |

## LiveLeaderSkill

主鍵為 `id`。主要及附加條件各自對應其效果，不合併關聯。

| 轉換 | 來源欄位                                        | 型別        | 回傳對應／關聯                                                                |
| ---- | ----------------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| ✓    | `id`                                            | TEXT        | `leaderSkills[].id`                                                           |
| ✓    | `live_skill_trigger_group_id`                   | TEXT / null | `liveSkillTriggerGroupId` → `LiveSkillTrigger.group_id`                       |
| ✓    | `live_passive_skill_effect_group_id`            | TEXT        | `livePassiveSkillEffectGroupId` → `LivePassiveSkillEffect.group_id`           |
| ✓    | `additional_live_skill_trigger_group_id`        | TEXT / null | `additionalLiveSkillTriggerGroupId` → `LiveSkillTrigger.group_id`             |
| ✓    | `additional_live_passive_skill_effect_group_id` | TEXT / null | `additionalLivePassiveSkillEffectGroupId` → `LivePassiveSkillEffect.group_id` |
|      | `description_lang_id`                           | TEXT        | 完整六語來源描述驗證使用，未重複放入轉換結果                                  |

## LivePassiveSkillEffect

主鍵依序為 `(group_id, number)`。原始 `value` 為字串；目前使用類型 4、5、6、8、10 的模板參數 `percent` 為 `Number(value) / 10`。

| 轉換 | 來源欄位                      | 型別               | 回傳對應／關聯                                                 |
| ---- | ----------------------------- | ------------------ | -------------------------------------------------------------- |
| ✓    | `group_id`                    | TEXT               | `effects[groupId][].groupId`                                   |
| ✓    | `number`                      | INTEGER            | `number`，組內排序                                             |
| ✓    | `type`                        | INTEGER            | `type`，保留來源數值                                           |
| ✓    | `value`                       | TEXT / null        | `value`，保留原始值及 null                                     |
| ✓    | `live_skill_effect_target_id` | TEXT / null        | `liveSkillEffectTargetId` → `LiveSkillEffectTarget.id`         |
| ✓    | `resource_type`               | INTEGER / null     | `resourceType`                                                 |
| ✓    | `resource_ids`                | TEXT（JSON）/ null | `resourceIds`，依來源陣列順序解析；保留 null                   |
| ✓    | `description_lang_id`         | TEXT               | 查 `LangGeneratedLivePassiveSkillEffect.id` 歸納 `description` |

## LiveSkillTrigger

主鍵依序為 `(group_id, number)`。目前使用類型為 1、2、4、7、8、9、10、11、12。

| 轉換 | 來源欄位                   | 型別               | 回傳對應／關聯                                           |
| ---- | -------------------------- | ------------------ | -------------------------------------------------------- |
| ✓    | `group_id`                 | TEXT               | `triggers[groupId][].groupId`                            |
| ✓    | `number`                   | INTEGER            | `number`，組內排序                                       |
| ✓    | `type`                     | INTEGER            | `type`，保留來源數值                                     |
| ✓    | `threshold`                | TEXT / null        | `threshold`，保留原始值及 null                           |
| ✓    | `character_ids`            | TEXT（JSON）/ null | `characterIds` → `Character.id`；保留 null               |
| ✓    | `character_grouping_id`    | TEXT / null        | `characterGroupingId` → `CharacterGrouping.id`           |
| ✓    | `music_id`                 | TEXT / null        | `musicId`，保留來源 ID                                   |
| ✓    | `card_attribute_type`      | INTEGER / null     | `cardAttributeType`，保留來源數值                        |
| ✓    | `live_note_judgement_type` | INTEGER / null     | `liveNoteJudgementType`，保留來源數值                    |
| ✓    | `description_lang_id`      | TEXT               | 查 `LangGeneratedLiveSkillTrigger.id` 歸納 `description` |

## 文字表與目標

`LangCostume`、`LangGeneratedLivePassiveSkillEffect`、`LangGeneratedLiveSkillTrigger` 及驗證使用的 `LangGeneratedLiveLeaderSkill` 主鍵皆依序為 `(language, id)`；`language` 與 `id` 為 TEXT，`text` 為 TEXT / null。轉換讀取 `gameLocales` 的六語文字，缺列或 null 翻譯以來源表、欄位、資料鍵及語言回報錯誤。空字串與文字標記原樣保留。

目標欄位見 [Live 技能效果目標](live-skill-effect-targets.md)。本流程將其描述改為共用模板參照；既有 `transformLiveSkillEffectTargets` 介面仍回傳完整六語描述。角色及群組查詢僅需 ID、名稱文字 ID 與六語名稱。

## 描述 catalog 與確認流程

`description` 為 `{ templateId, params } | null`。`catalog.templates` 保存六語模板及具名參數；`catalog.labels` 保存角色、群組、含完整標記的屬性及判定文字。參數保存數值，或 `{ kind, id }` 實體參照。效果的 `target` 參照 `targets` 中的模板描述。完整來源描述僅供歸納與比對，不另存於輸出。

歸納先以完整實體文字保護 Target、角色、群組、屬性標記及判定，再依原文位置辨識完整數值。各參數須有唯一位置，六語插值後皆須精確還原來源；同領域、type、參數意義與六語句型才共用模板。同 type 可有多個句型。

已確認模板保存於 [live-skill-description-templates.ts](../../server/data/live-skill-description-templates.ts)，依領域與 type 分組，維護六語模板文字及具名參數。轉換依參數名稱集合選取唯一適用的已確認模板，檢查六語 placeholder 後直接採用設定文案。人工維護時依來源欄位確認參數意義，修改模板文字後重跑資料測試與本機 master 驗證。沒有適用的已確認模板時才自動歸納；多個已確認模板適用或 placeholder 無效時，保留結構資料並將描述列為待確認。

無法唯一歸納、未知類型或還原失敗時，保留結構化資料並將描述設為 null。`pendingDescriptions` 包含 `table`、`key`、`type`、`language`、`reason`，同時輸出警告；無法指定單一語言時 `language` 為 null。效果與條件的資料鍵格式為 `groupId:number`。來源缺列與缺翻譯仍使轉換失敗。

**CONFIRMED**：`live_skill_effect_target-character_grouping-grp-indonesia` 的 `target_count=null`，來源六語含 0 人文字，目前無效果引用。其人數語意為 **UNKNOWN**，保留 null 並列為待確認。

`renderSkillDescription(description, data, locale)` 展開模板與實體參照。`composeCostumeSkillDescription(skill, data, locale)` 分別組合主要與附加段落，依遊戲語言加入條件與技能段落的分隔標點，見[卡片資料](cards.md#隊長服裝技能顯示)。兩個函式接受唯讀的精簡描述資料；多列條件或效果的連接規則為 **UNKNOWN**，組合函式回傳 null，並透過可選的 `onFailure(reason)` 回呼交由 server 記錄警告。前端呼叫不修改 payload。列表投影與顯示見[卡片資料](cards.md#隊長服裝技能顯示)。

## 觀察與驗證

2026-10-20 本機快照 `master_version=452bd7acfd1b9f90cc85d9978aea55b1a6bf6c2cddaff470c640462830c8c00d`：204 筆 Costume、196 筆 LiveLeaderSkill、192 筆 Effect、215 筆 Trigger、83 筆 Target。自動歸納與目前已確認模板皆有 18 個模板（Effect 5、Trigger 9、Target 4），可顯示 2,934 筆六語描述，僅上述 Indonesia Target 待確認。自動歸納逐字還原上述描述，另有 1,176 個完整技能描述比對通過，完整描述僅忽略首尾空白。`tests/data/live-skills-master.test.ts` 驗證自動歸納的來源一致性及已確認模板的完整組合；已確認模板允許維護獨立文案。驗證指令見 [CONTRIBUTING.md](../../CONTRIBUTING.md)。
