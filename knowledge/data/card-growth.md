# 卡片成長資料字典與轉存對照

輸出為 `public/data/card-growth.json`，包含 levels、levelLimits、potentials 三個以來源 group_id 為 key 的物件，以及 potentialUpgradeItems 字典。組別值依等級或階段排序，保留全部來源組別，包含目前沒有卡片引用的組別；綻放階段保留每筆效果。CardPotentialUpgradeItem 以 rarity 字串為 key 對應 itemId。卡片關聯見 [cards.md](cards.md)。來源與適用快照見 [知識索引](../README.md)。

欄位名稱、SQLite 型別、主鍵、schema 宣告的關聯與轉存對應均為 **CONFIRMED**。用途尚未完整追蹤者另以信心標籤標示；宣告的關聯不等同 SQLite 外鍵約束。`✓` 表示直接輸出或經查表產生輸出，空白表示尚未轉存。

## CardLevel

每筆代表某成長組別在一個卡片等級的數值。parameter_base_value 轉為 number；三圍權重保存在卡片上。

**CONFIRMED**：主鍵為 `group_id, level`，目前快照 1890 筆。

| 轉存 | 來源欄位                       | 型別                            | 意義                                                                | 關聯                                | 輸出對應                                                       | 備註／未轉存原因                                                                                                           |
| ---- | ------------------------------ | ------------------------------- | ------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ✓    | `group_id`                     | TEXT                            | 等級成長組別 ID                                                     | `Card.card_level_group_id → 本欄位` | `levels 的物件 key`                                            | —                                                                                                                          |
| ✓    | `level`                        | INTEGER                         | 卡片等級                                                            | —                                   | `levels[groupId][].level`                                      | —                                                                                                                          |
| ✓    | `parameter_base_value`         | TEXT（int64 十進位字串）        | 該等級的基礎能力總量，供三圍權重使用                                | —                                   | `levels[groupId][].parameterBaseValue（Number）`               | —                                                                                                                          |
| ✓    | `exp`                          | TEXT（int64 十進位字串） / null | 到達該等級的累積經驗值門檻                                          | —                                   | `levels[groupId][].exp（Number 或 null）`                      | null 保留；`grp-card-level-rarity_5-06` 的 1–5 級為 null、40、100、190、310；第 1 級 null 處理與門檻相等的判斷 **UNKNOWN** |
| ✓    | `live_deck_power_permyriad_up` | TEXT（int64 十進位字串） / null | Live deck power 萬分比加成欄位 **LIKELY**；實際套用方式 **UNKNOWN** | —                                   | `levels[groupId][].liveDeckPowerPermyriadUp（Number 或 null）` | null 保留；目前值為 null、1、2、3、4、5、8                                                                                 |

## CardLevelLimit

每筆代表某特訓組別在一個特訓次數的等級上限。SQLite 主鍵中的零次特訓以 0 保存。

**CONFIRMED**：主鍵為 `group_id, limit_break_count`，目前快照 45 筆。

| 轉存 | 來源欄位            | 型別                | 意義                     | 關聯                                      | 輸出對應                                                                                                                | 備註／未轉存原因                                                       |
| ---- | ------------------- | ------------------- | ------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ✓    | `group_id`          | TEXT                | 特訓上限組別 ID          | `Card.card_level_limit_group_id → 本欄位` | `levelLimits 的物件 key`                                                                                                | —                                                                      |
| ✓    | `limit_break_count` | INTEGER             | 特訓次數，0 表示尚未特訓 | —                                         | `levelLimits[groupId][].limitBreakCount`                                                                                | —                                                                      |
| ✓    | `level_limit`       | INTEGER             | 該特訓次數的最高等級     | —                                         | `levelLimits[groupId][].levelLimit`                                                                                     | —                                                                      |
| ✓    | `consumptions`      | TEXT（JSON） / null | 該階段消耗的資源清單     | `common.Consumption`                      | `levelLimits[groupId][].consumptions`；resource_type.number → resourceType、resource_id → resourceId、quantity → Number | null 保留；空陣列保留；依來源順序輸出，未知 resource enum 數值原樣保留 |

## CardPotential

每筆代表某綻放組別在一個階段的一種效果。同一階段可包含不同 effect_type，轉換保留每筆原始效果。

**CONFIRMED**：主鍵為 `group_id, upgrade_count, effect_type`，目前快照 15 筆。

| 轉存 | 來源欄位        | 型別                     | 意義                                                | 關聯                                    | 輸出對應                                | 備註／未轉存原因 |
| ---- | --------------- | ------------------------ | --------------------------------------------------- | --------------------------------------- | --------------------------------------- | ---------------- |
| ✓    | `group_id`      | TEXT                     | 綻放組別 ID                                         | `Card.card_potential_group_id → 本欄位` | `potentials 的物件 key`                 | —                |
| ✓    | `upgrade_count` | INTEGER                  | 綻放階段                                            | —                                       | `potentials[groupId][].upgradeCount`    | —                |
| ✓    | `effect_type`   | INTEGER（enum）          | 效果類型；見枚舉                                    | `enums.CardPotentialEffectType`         | `potentials[groupId][].effectType`      | —                |
| ✓    | `value`         | TEXT（int64 十進位字串） | 效果值；技能等級或三圍千分比等，依 effect_type 解讀 | —                                       | `potentials[groupId][].value（Number）` | —                |

## 綻放效果枚舉

CardPotentialEffectType 的 schema 定義如下（**CONFIRMED**）：

| 值  | 定義                                                   |
| --- | ------------------------------------------------------ |
| 0   | UNKNOWN                                                |
| 1   | ACTIVE_SKILL_LEVEL_UP：主動技能等級效果                |
| 2   | PASSIVE_SKILL_LEVEL_UP：被動技能等級效果               |
| 3   | SPECIAL_SKILL_LEVEL_UP：特殊技能等級效果               |
| 4   | ALL_PARAMETER_UP_PERMIL_UP：全三圍千分比效果           |
| 5   | SKILL_TREE_CONNECT_EFFECT_LEVEL_UP：技能樹連結效果等級 |

綻放資料保存原始階段與效果值。三圍計算與效果套用由後續計算程式處理。

## CardPotentialUpgradeItem

每筆記錄一種卡片稀有度對應的綻放道具 ID。轉存至 `potentialUpgradeItems`，以 rarity 的十進位字串為 key，值為 `{ itemId }`；SQL 依 rarity 排序並保留來源列。已確認的來源資料包含 rarity 5 對應 `item-card-potential-upgrade-cmn`。

**CONFIRMED**：主鍵為 `rarity`，目前快照 1 筆。

| 轉存 | 來源欄位  | 型別            | 意義        | 關聯               | 輸出對應                            | 備註                                              |
| ---- | --------- | --------------- | ----------- | ------------------ | ----------------------------------- | ------------------------------------------------- |
| ✓    | `rarity`  | INTEGER（enum） | 卡片稀有度  | `enums.CardRarity` | `potentialUpgradeItems` 的 key      | 以 `Card.rarity` 查找；此關係不是宣告的 Card 外鍵 |
| ✓    | `item_id` | TEXT            | 綻放道具 ID | `Item.id`          | `potentialUpgradeItems[key].itemId` | —                                                 |

`consumptions` 的結構為 common.Consumption[]；來源 JSON 的 `resource_type` 是含 `name` 與 `number` 的 enum 物件，另含 `resource_id` 與 int64 十進位字串 `quantity`。輸出採用 enum 數值、資源 ID 與數值數量；resource_type 決定資源 ID 的解讀，schema 未宣告單一目的表外鍵。
