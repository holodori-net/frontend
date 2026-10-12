# 角色群組資料字典與轉換對照

`transformCharacterGroups(database)` 回傳 `CharacterGroupData[]`，保留全部角色群組，並依 `order`、`id` 排序。群組成員透過 Character ID 關聯角色；角色上的常規群組 ID 陣列另回傳於 [characters.md](characters.md)。來源與適用快照見[知識索引](../README.md)。

欄位名稱、SQLite 型別、schema 宣告的關聯與轉換對應均為 **CONFIRMED**。宣告的關聯不等同 SQLite 外鍵約束。`✓` 表示已直接轉換或經查表產生回傳值。

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
