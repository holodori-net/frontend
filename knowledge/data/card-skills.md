# 卡片被動、主動與特殊技能資料字典

`transformCardSkillData(database, confirmedTemplates?)` 回傳 `CardSkillData`，包含依技能 ID 分組的 `passiveSkills`、`activeSkills`、`specialSkills`，以及共用 `effects`、`activeEffects`、`triggers`、`targets`、`catalog`、`pendingDescriptions`。技能等級依來源 `level` 排序；效果與條件依 `number` 排序。型別見 [card-skills.ts](../../shared/game-data/card-skills.ts)，轉換見 [card-skills.ts](../../server/data/converters/card-skills.ts)。

以下欄位、型別、主鍵與資料關聯為 **CONFIRMED**，由本機 SQLite `PRAGMA table_info`、唯讀查詢及轉換程式確認。`✓` 表示已轉換；關聯不等同 SQLite 外鍵約束。

## 卡片關聯與技能 ID

`Card.live_passive_skill_id`、`live_active_skill_id`、`live_special_skill_id` 均為非 nullable 的 TEXT，由 `transformCards()` 分別回傳 `livePassiveSkillId`、`liveActiveSkillId`、`liveSpecialSkillId`。各自關聯 `LivePassiveSkill.id`、`LiveActiveSkill.id`、`LiveSpecialSkill.id`；這三張 ID 表皆只有非 nullable TEXT 主鍵 `id`。

各類技能的全部等級來自對應 `*SkillLevel` 表，包含未直接被卡片引用的主動技能。轉換保留來源等級，不選取最高等級。列表保留卡片的三類技能 ID，按 ID 共用被引用技能的全部等級及可達描述依賴。主動效果以獨立的 `activeEffects` 字典保存精簡描述；服裝與卡片技能共用模板、Target 與實體標籤，機率標籤依選中主動技能各等級的原始機率值收集。技能等級保留組合所需欄位，效果的原始欄位及待確認診斷留在 server。

## LivePassiveSkillLevel

主鍵為 `(live_passive_skill_id, level)`。

| 轉換 | 來源欄位                                        | 型別        | 回傳對應／關聯                                        |
| ---- | ----------------------------------------------- | ----------- | ----------------------------------------------------- |
| ✓    | `live_passive_skill_id`                         | TEXT        | `passiveSkills[id][].livePassiveSkillId`              |
| ✓    | `level`                                         | INTEGER     | `level`，來源等級                                     |
| ✓    | `live_skill_trigger_group_id`                   | TEXT / null | `liveSkillTriggerGroupId` → `triggers`                |
| ✓    | `live_passive_skill_effect_group_id`            | TEXT        | `livePassiveSkillEffectGroupId` → `effects`           |
| ✓    | `additional_live_skill_trigger_group_id`        | TEXT / null | `additionalLiveSkillTriggerGroupId` → `triggers`      |
| ✓    | `additional_live_passive_skill_effect_group_id` | TEXT / null | `additionalLivePassiveSkillEffectGroupId` → `effects` |
|      | `description_lang_id`                           | TEXT        | 完整描述來源驗證使用，不重複放入轉換結果              |

## LiveActiveSkillLevel

主鍵為 `(live_active_skill_id, level)`。毫秒、千分比與次數保留來源數值及 null。

| 轉換 | 來源欄位                                       | 型別           | 回傳對應／關聯                                             |
| ---- | ---------------------------------------------- | -------------- | ---------------------------------------------------------- |
| ✓    | `live_active_skill_id`                         | TEXT           | `activeSkills[id][].liveActiveSkillId`                     |
| ✓    | `level`                                        | INTEGER        | `level`                                                    |
| ✓    | `live_skill_trigger_group_id`                  | TEXT / null    | `liveSkillTriggerGroupId` → `triggers`                     |
| ✓    | `live_active_skill_effect_group_id`            | TEXT           | `liveActiveSkillEffectGroupId` → `activeEffects`           |
| ✓    | `additional_live_skill_trigger_group_id`       | TEXT / null    | `additionalLiveSkillTriggerGroupId` → `triggers`           |
| ✓    | `additional_live_active_skill_effect_group_id` | TEXT / null    | `additionalLiveActiveSkillEffectGroupId` → `activeEffects` |
| ✓    | `cool_time_millisecond`                        | INTEGER / null | `coolTimeMillisecond`，發動間隔                            |
| ✓    | `activation_probability_permil_multiply`       | INTEGER / null | `activationProbabilityPermilMultiply`，原始機率            |
| ✓    | `limit_count`                                  | INTEGER / null | `limitCount`，來源次數限制                                 |
| ✓    | `effect_duration_millisecond`                  | INTEGER / null | `effectDurationMillisecond`，效果持續時間                  |
|      | `description_lang_id`                          | TEXT           | 完整描述來源驗證使用                                       |

## LiveSpecialSkillLevel

主鍵為 `(live_special_skill_id, level)`。特殊技能與主動技能共用 `LiveActiveSkillEffect`。

| 轉換 | 來源欄位                                       | 型別           | 回傳對應／關聯                                             |
| ---- | ---------------------------------------------- | -------------- | ---------------------------------------------------------- |
| ✓    | `live_special_skill_id`                        | TEXT           | `specialSkills[id][].liveSpecialSkillId`                   |
| ✓    | `level`                                        | INTEGER        | `level`                                                    |
| ✓    | `live_active_skill_effect_group_id`            | TEXT           | `liveActiveSkillEffectGroupId` → `activeEffects`           |
| ✓    | `additional_live_skill_trigger_group_id`       | TEXT / null    | `additionalLiveSkillTriggerGroupId` → `triggers`           |
| ✓    | `additional_live_active_skill_effect_group_id` | TEXT / null    | `additionalLiveActiveSkillEffectGroupId` → `activeEffects` |
| ✓    | `effect_duration_millisecond`                  | INTEGER / null | `effectDurationMillisecond`                                |
|      | `description_lang_id`                          | TEXT           | 完整描述來源驗證使用                                       |

## LiveActiveSkillEffect

主鍵為 `(group_id, number)`。

| 轉換 | 來源欄位                                      | 型別           | 回傳對應／用途                                                |
| ---- | --------------------------------------------- | -------------- | ------------------------------------------------------------- |
| ✓    | `group_id`                                    | TEXT           | `activeEffects[groupId][].groupId`                            |
| ✓    | `number`                                      | INTEGER        | `number`，組內排序                                            |
| ✓    | `type`                                        | INTEGER        | `type`，保留來源類型                                          |
| ✓    | `value`                                       | TEXT / null    | `value`，保留原始字串及 null                                  |
| ✓    | `score_up_based_on_parameter_permil_multiply` | INTEGER / null | `scoreUpBasedOnParameterPermilMultiply`                       |
| ✓    | `description_lang_id`                         | TEXT           | 查 `LangGeneratedLiveActiveSkillEffect.id` 產生 `description` |

目前使用的主動效果類型及模板參數：

| type | 來源枚舉名稱後綴                                        | 參數                            |
| ---- | ------------------------------------------------------- | ------------------------------- |
| 1    | `SCORE_UP_PERMIL_UP`                                    | `percent = Number(value) / 10`  |
| 5    | `SCORE_UP_EFFECT_UP_PERMIL_UP`                          | `percent = Number(value) / 10`  |
| 6    | `LIVE_ACTIVE_SKILL_ACTIVATION_PROBABILITY_UP_PERMIL_UP` | `percent = Number(value) / 10`  |
| 8    | `LIFE_RECOVERY`                                         | `amount = value`，直接回復量    |
| 9    | `JUDGEMENT_ENHANCE`                                     | 固定判定文案；來源 `value=null` |

`activeEffect` 與被動效果的 `effect` 為不同模板領域；相同 type 數值不共用其語意。被動效果、條件與目標的欄位及模板流程見 [服裝技能](costume-live-skills.md)。兩個轉換入口共用必要查詢與模板轉換，各自讀取其技能關聯。

## 六語描述組合

`composePassiveSkillDescription`、`composeActiveSkillDescription`、`composeSpecialSkillDescription` 位於 [live-skill-description.ts](../../shared/game-data/live-skill-description.ts)。函式接收指定等級列、唯讀描述資料、遊戲語言、可選的 `onFailure(reason)` 及第五個參數 `format: 'source' | 'display'`（預設 `source`），回傳 `string | null`。組合不修改資料，時間僅在組合時由毫秒除以 1,000 換算為秒。

`source` 模式供來源還原與驗證。被動技能分別組合主要與附加條件／效果：日文與中文直接相接，英文及韓文以空格相接，印尼文使用 `Saat {trigger}, {effect}`。主要與附加段落在日文以換行相隔，其餘語言以空格相隔。主動技能保留各語言的時間、機率、效果順序；特殊技能共用持續時間與主動效果描述。屬性標記、描述內部空白、標點與日文換行保留。

`display` 模式供列表使用。條件與效果間，繁簡中文使用 `，`、日文使用 `、`，其餘語言使用逗號加空格；主要與附加段落間，繁簡中文及日文使用 `、`，其餘語言使用分號加空格。時間與機率子句依語言補上分隔，片段邊界去除重複標點，內文與屬性標記保留。隊長服裝技能沿用相同分隔符。

主動技能 `catalog.labels.probability` 保存以下已確認來源值的六語標籤，原始機率不變：

| 值  | jpn    | eng                | ind            | kor       | cht    | chs      |
| --- | ------ | ------------------ | -------------- | --------- | ------ | -------- |
| 370 | 低確率 | Low Probability    | Peluang Rendah | 낮은 확률 | 低機率 | 低概率   |
| 460 | 中確率 | Medium Probability | Peluang Sedang | 중간 확률 | 中機率 | 中等概率 |
| 550 | 高確率 | High Probability   | Peluang Tinggi | 높은 확률 | 高機率 | 高概率   |

已確認模板依領域、type 與參數名稱直接採用六語設定文案；來源文案變動不取代設定。沒有適用模板時才自動歸納。模板與組合結果移除升級標示 `[highlight]`，不保存升級標示狀態。

未知類型、機率、條件組合、未確認的多列連接或無法解析的描述回傳 null；server 記錄來源、等級、語言及原因，結構資料仍保留。缺少必要來源參照或翻譯使轉換失敗。多列連接規則與其他機率值的分類為 **UNKNOWN**。

## 列表顯示

卡片顯示將「被動技能」、「主動技能」、「特殊技能」各自分組，使用 PrimeVue InputGroup 將技能名稱、左側的圓形排序 Badge 與完整 payload 的可用等級按鈕相連；技能全部等級關閉時，Badge 顯示「−」。群組內高度、字級與內距一致，只有外側保留小圓角。各按鈕使用緊湊的 PrimeVue Button，選取時為 primary 色，未選時為 secondary outlined 樣式，以 aria-pressed 表達狀態。基礎資訊與技能群組共用同一層靠上排列，基本高度為 32px；技能群組依內容寬度整組換行。基礎資訊以同樣的 InputGroup 提供卡名、角色名及三圍與合計的獨立開關，子項依內容寬度排列，空間不足時換行，整組共用排序位置。窄螢幕允許技能名稱折行，等級 chip 維持並排。所有資訊依選取先後排列，同一技能新增或移除部分等級時保留位置，清空後重新選取則移至最後。每類技能以 PrimeVue `Divider` 顯示一次標題，已選來源等級依遞增順序自然排列，以左側小型等級標籤搭配右側完整描述。標題與等級標籤跟隨網站語言，描述跟隨遊戲語言。完整卡圖的 subgrid 對齊同排各資訊欄位的起點，技能內的等級共用一列；直式版型在右側資訊欄維持相同選取順序。

首次使用開啟一般資訊，三類卡片技能只選 Lv. 2。`holodori-card-fields` 以 `{ fields, skillLevels }` 保存資訊順序與等級；既有偏好保留選取項目，基礎資訊依最早出現項目歸組並保留組內順序；舊版有效陣列的已選技能使用 Lv. 2。「重設顯示」恢復目前版本的預設版型、資訊項目、技能等級與順序並儲存偏好；技能使用可用的 Lv. 2。清空某類技能的等級會移除整個區塊及間距。個別卡片缺少已選等級時不顯示空標題，但保留完整卡圖的共用列位置及直式清單的欄位位置。描述無法組合時保留該等級並顯示本地化提示；缺少必要技能或等級來源使生成失敗。

## 觀察與驗證

2026-10-20 本機快照 `master_version=452bd7acfd1b9f90cc85d9978aea55b1a6bf6c2cddaff470c640462830c8c00d`：196 個被動技能／392 列等級、198 個主動技能／395 列等級、196 個特殊技能／392 列等級；有 2 個主動技能未被卡片直接引用。主動效果共 55 筆（type 1：22、5：22、6：6、8：3、9：2）。

**CONFIRMED**：此快照的列表投影包含 196 張卡片、三類技能各 392 列等級。`JSON.stringify(readCardList())` 為 848,532 bytes，以 Node.js `gzipSync` 預設設定壓縮為 70,185 bytes；Nuxt 生成的 payload 使用自己的序列化格式。

`tests/data/card-skills-master.test.ts` 驗證全部 330 個主動效果六語描述與 7,074 個完整技能描述。自動歸納比對只移除來源 `[highlight]` 標記及首尾空白；已確認模板另驗證完整組合，允許獨立文案。共用的 Indonesia Target 因人數為 null 保持待確認，詳見 [服裝技能](costume-live-skills.md#描述-catalog-與確認流程)。記憶體 SQLite 測試涵蓋欄位保留、排序、錯誤與轉換入口的資料表邊界；列表投影測試驗證全部被引用等級的六語組合與完整 converter 一致、移除未引用資料及缺少必要等級時的錯誤。指令見 [CONTRIBUTING.md](../../CONTRIBUTING.md)。
