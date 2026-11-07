# 角色群組資料字典與轉換對照

`transformCharacterGroups(database)` 回傳 `CharacterGroupData[]`，保留全部角色群組，並依 `order`、`id` 排序。群組成員透過 Character ID 關聯角色；角色上的常規群組 ID 陣列另回傳於 [characters.md](characters.md)。來源與適用快照見[知識索引](../README.md)。

欄位名稱、SQLite 型別、schema 宣告的關聯與轉換對應均為 **CONFIRMED**。宣告的關聯不等同 SQLite 外鍵約束。`✓` 表示已直接轉換或經查表產生回傳值。

## 成員選單 payload

`server/data/member-groups.ts` 重用 `transformCharacterGroups(database)`，只選取 `isRegular` 為 true 的群組，投影 `id`、六語 `name`、`characterIds` 與 `order`。`app/plugins/member-groups.ts` 以 `useAsyncData('member-groups', ...)` 保存於 Nuxt payload；讀取或轉換錯誤使生成失敗並保留來源錯誤。離線頁面沿用同一快照中的 payload。

頁首主題與卡片／歌曲篩選共用 `MemberSelect`，群組名稱跟隨遊戲語言，排序依群組 `order`、`id`，組內依來源 `characterIds` 順序。成員同時屬於多個群組時，各組皆顯示相同成員 ID，選取同步且不重複保存 ID 或 Chip。空群組省略；沒有群組的可選成員置於最後的「其他」。例如 `chr-00006` 同時顯示於 `grp-gen_1` 與 `grp-gamers`。

## CharacterGrouping

每筆代表一個角色群組。資料字典依 master.sqlite 的 `PRAGMA table_info` 與 logical fields 整理；群組多語文字由 `LangCharacterGrouping` 依文字 ID 查詢。

**CONFIRMED**：主鍵為 `id`。

| 轉換 | 來源欄位              | 型別                      | 意義               | 關聯                       | 回傳對應                       | 備註                                                               |
| ---- | --------------------- | ------------------------- | ------------------ | -------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| ✓    | `id`                  | TEXT                      | 群組 ID            | —                          | `[].id`                        | 保留來源 ID                                                        |
| ✓    | `name_lang_id`        | TEXT                      | 群組名稱文字 ID    | `LangCharacterGrouping.id` | `[].name`（六語）              | 每種遊戲語言均須有非 null 翻譯；空字串與 `-` 保留                  |
| ✓    | `description_lang_id` | TEXT                      | 群組說明文字 ID    | `LangCharacterGrouping.id` | `[].description`（六語）       | 每種遊戲語言均須有非 null 翻譯；空字串與 `-` 保留                  |
| ✓    | `is_regular`          | INTEGER（boolean） / null | 是否為常規角色群組 | —                          | `[].isRegular`（轉為 boolean） | null 轉為 false                                                    |
| ✓    | `character_ids`       | TEXT（JSON） / null       | 群組角色 ID 陣列   | `Character.id`             | `[].characterIds`              | 保留陣列順序；null 轉為空陣列；非法 JSON 報錯並帶來源欄位及 row ID |
| ✓    | `asset_id`            | TEXT                      | 群組素材識別碼     | —                          | `[].assetId`                   | —                                                                  |
| ✓    | `color1`              | TEXT                      | 群組第一顏色       | —                          | `[].color1`                    | 原值回傳                                                           |
| ✓    | `color2`              | TEXT                      | 群組第二顏色       | —                          | `[].color2`                    | 原值回傳                                                           |
| ✓    | `order`               | INTEGER                   | 顯示排序值         | —                          | `[].order`                     | 同排序值再依 `id` 排序                                             |

## LangCharacterGrouping

每筆代表角色群組的一個語言文字。語言集合由 `shared/language.ts` 的 `gameLocales` 定義：`jpn`、`eng`、`ind`、`kor`、`cht`、`chs`。

**CONFIRMED**：主鍵為 `language, id`。

| 轉換 | 來源欄位   | 型別        | 意義                  | 關聯                                                                      | 回傳對應                             | 備註                                      |
| ---- | ---------- | ----------- | --------------------- | ------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------- |
| ✓    | `id`       | TEXT        | 群組名稱或說明文字 ID | `CharacterGrouping.name_lang_id`、`CharacterGrouping.description_lang_id` | `[].name`、`[].description` 的查表鍵 | —                                         |
| ✓    | `language` | TEXT        | 遊戲語言代碼          | —                                                                         | 多語物件鍵                           | 僅回傳設定的六種語言                      |
| ✓    | `text`     | TEXT / null | 該語言的文字          | —                                                                         | 多語物件值                           | 缺列或 null 使轉換失敗；空字串與 `-` 保留 |

## 觀察快照

本文件依 master.sqlite 的 `PRAGMA table_info`、`logical_fields`、`declared_foreign_keys` 及唯讀查詢確認。觀察日期為 2026-10-11，`master_version` 為 `65badf8533aacbc04382f97f0f5f56740e761e6f5be6172d8440ae9061deebe7`；包含 16 個 CharacterGrouping 與 192 筆 LangCharacterGrouping。
