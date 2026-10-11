# Live 技能效果目標資料字典與轉存對照

輸出為 `public/data/live-skill-effect-targets.json`，保留全部目標資料並依 `id` 排序。角色與群組關聯見 [characters.md](characters.md) 及 [character-groups.md](character-groups.md)。來源與適用快照見[知識索引](../README.md)。

欄位名稱、SQLite 型別、主鍵、schema 宣告的關聯與轉存對應均為 **CONFIRMED**。宣告的關聯不等同 SQLite 外鍵約束。`✓` 表示直接輸出或經查表產生輸出。

## LiveSkillEffectTarget

每筆代表一種 Live 技能效果目標。`LivePassiveSkillEffect.live_skill_effect_target_id` 透過本表的 `id` 關聯目標；目標類型、人數與篩選欄位保留來源值。

**CONFIRMED**：主鍵為 `id`。目前快照的目標類型為 SELF、ALL、CHARACTER_GROUPING 與 ATTRIBUTE；`character_id` 皆為 null。

| 轉存 | 來源欄位                | 型別                   | 意義            | 關聯                                    | 輸出對應                 | 備註                    |
| ---- | ----------------------- | ---------------------- | --------------- | --------------------------------------- | ------------------------ | ----------------------- |
| ✓    | `id`                    | TEXT                   | 目標 ID         | —                                       | `[].id`                  | 保留來源 ID             |
| ✓    | `type`                  | INTEGER（enum）        | 目標類型        | `enums.LiveSkillEffectTargetType`       | `[].type`                | 保留數值；見枚舉        |
| ✓    | `target_count`          | INTEGER / null         | 目標人數        | —                                       | `[].targetCount`         | null 與數值原樣保留     |
| ✓    | `character_id`          | TEXT / null            | 指定角色 ID     | `Character.id`                          | `[].characterId`         | null 原樣保留           |
| ✓    | `character_grouping_id` | TEXT / null            | 指定角色群組 ID | `CharacterGrouping.id`                  | `[].characterGroupingId` | null 原樣保留           |
| ✓    | `card_attribute_type`   | INTEGER（enum） / null | 指定卡片屬性    | `enums.CardAttributeType`               | `[].cardAttributeType`   | 保留數值及 null；見枚舉 |
| ✓    | `description_lang_id`   | TEXT                   | 目標描述文字 ID | `LangGeneratedLiveSkillEffectTarget.id` | `[].description`（六語） | 依文字 ID 查詢描述      |

## LangGeneratedLiveSkillEffectTarget

每筆代表一個目標描述文字 ID 在一種遊戲語言的文字。語言集合由 `shared/language.ts` 的 `gameLocales` 定義：`jpn`、`eng`、`ind`、`kor`、`cht`、`chs`。

**CONFIRMED**：主鍵為 `language, id`。每種設定語言皆須有非 null 翻譯；缺列或 null 使轉換失敗並回報來源表、欄位、目標 ID、語言與文字 ID。空字串與文字標記原樣保留。

| 轉存 | 來源欄位   | 型別        | 意義             | 關聯                                        | 輸出對應                    | 備註                 |
| ---- | ---------- | ----------- | ---------------- | ------------------------------------------- | --------------------------- | -------------------- |
| ✓    | `language` | TEXT        | 遊戲語言代碼     | —                                           | `[].description` 的語言 key | 僅輸出設定的六種語言 |
| ✓    | `id`       | TEXT        | 目標描述文字 ID  | `LiveSkillEffectTarget.description_lang_id` | `[].description` 的查表鍵   | —                    |
| ✓    | `text`     | TEXT / null | 該語言的目標描述 | —                                           | `[].description[language]`  | 保留來源文字與標記   |

## 枚舉

以下值由資料庫的枚舉表確認（**CONFIRMED**）：

| 枚舉                      | 數值與定義                                                               |
| ------------------------- | ------------------------------------------------------------------------ |
| LiveSkillEffectTargetType | 0 UNKNOWN；1 SELF；2 ALL；3 CHARACTER；4 CHARACTER_GROUPING；5 ATTRIBUTE |
| CardAttributeType         | 0 UNKNOWN；1 ATTRIBUTE_1；2 ATTRIBUTE_2；3 ATTRIBUTE_3                   |

## 觀察快照

本文件依 `.data/master.sqlite` 的 `PRAGMA table_info`、`logical_fields`、`declared_foreign_keys`、`enum_LiveSkillEffectTargetType`、`enum_CardAttributeType` 及唯讀查詢確認。觀察日期為 2026-10-13，`master_version` 為 `65badf8533aacbc04382f97f0f5f56740e761e6f5be6172d8440ae9061deebe7`；包含 83 筆 LiveSkillEffectTarget 與 498 筆 LangGeneratedLiveSkillEffectTarget。
