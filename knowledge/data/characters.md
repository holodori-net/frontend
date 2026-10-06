# 角色資料字典與轉存對照

輸出為 `public/data/characters.json`，保留全部角色，包含非可遊玩角色。卡片以 characterId 關聯角色 id，見 [cards.md](cards.md)。來源與適用快照見 [知識索引](../README.md)。

欄位名稱、SQLite 型別、主鍵、schema 宣告的關聯與轉存對應均為 **CONFIRMED**。用途尚未完整追蹤者另以信心標籤標示；宣告的關聯不等同 SQLite 外鍵約束。`✓` 表示直接輸出或經查表產生輸出，空白表示尚未轉存。

## Character

每筆代表一位角色。完整名稱經 name_lang_id 查找 LangCharacter；資料表另提供簡稱、介紹、群組、服裝與養成關聯。

**CONFIRMED**：主鍵為 `id`，目前快照 62 筆。

| 轉存 | 來源欄位                                  | 型別                      | 意義                                                                         | 關聯                                 | 輸出對應                                        | 備註／未轉存原因                                                          |
| ---- | ----------------------------------------- | ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------- |
| ✓    | `id`                                      | TEXT                      | 角色 ID                                                                      | —                                    | `characters[].id`                               | —                                                                         |
| ✓    | `name_lang_id`                            | TEXT                      | 完整角色名稱文字 ID                                                          | [`LangCharacter.id`](#langcharacter) | `characters[].name（依語言查 LangCharacter）`   | —                                                                         |
|      | `short_name_lang_id`                      | TEXT                      | 角色簡稱文字 ID                                                              | [`LangCharacter.id`](#langcharacter) | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `name_eng`                                | TEXT                      | 來源英文名稱                                                                 | —                                    | —                                               | 名稱採用 LangCharacter 六語文字                                           |
|      | `short_name_eng`                          | TEXT                      | 來源英文簡稱                                                                 | —                                    | —                                               | 未輸出角色簡稱                                                            |
|      | `character_production_id`                 | TEXT / null               | 所屬製作／事務所資料 ID                                                      | `CharacterProduction.id`             | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `default_costume_id`                      | TEXT                      | 預設服裝 ID                                                                  | `Costume.id`                         | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `default_sd_costume_id`                   | TEXT                      | 預設 SD 服裝 ID                                                              | `SdCostume.id`                       | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `birth_month`                             | INTEGER                   | 生日月份                                                                     | —                                    | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `birth_day`                               | INTEGER                   | 生日日期                                                                     | —                                    | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `debut_year`                              | INTEGER                   | 出道年份                                                                     | —                                    | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `debut_month`                             | INTEGER                   | 出道月份                                                                     | —                                    | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `debut_day`                               | INTEGER                   | 出道日期                                                                     | —                                    | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `fan_name_lang_id`                        | TEXT / null               | 粉絲名稱文字 ID                                                              | [`LangCharacter.id`](#langcharacter) | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `description_lang_id`                     | TEXT / null               | 角色介紹文字 ID                                                              | [`LangCharacter.id`](#langcharacter) | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `comment_lang_id`                         | TEXT / null               | 角色留言文字 ID                                                              | [`LangCharacter.id`](#langcharacter) | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `youtube_url`                             | TEXT / null               | YouTube 網址                                                                 | —                                    | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `x_url`                                   | TEXT / null               | X 網址                                                                       | —                                    | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `personality_type`                        | INTEGER（enum） / null    | 性格分類；見枚舉                                                             | `enums.CharacterPersonalityType`     | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `sd_personality_type`                     | INTEGER（enum） / null    | SD 動畫類型；TYP000／001／002 選擇不同的動畫控制器、待機、喜悅及低分結果動作 | `enums.CharacterSdPersonalityType`   | —                                               | 未輸出角色詳細資料或養成資料；用途 **CONFIRMED**                          |
| ✓    | `is_playable`                             | INTEGER（boolean） / null | 是否可遊玩；資料庫以 INTEGER 保存                                            | —                                    | `characters[].isPlayable（INTEGER 轉 boolean）` | —                                                                         |
| ✓    | `asset_id`                                | TEXT                      | 角色素材識別碼                                                               | —                                    | `characters[].assetId`                          | —                                                                         |
|      | `character_level_group_id`                | TEXT / null               | 角色等級成長組別                                                             | `CharacterLevel.group_id`            | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `skill_tree_node_position_group_id`       | TEXT / null               | 技能樹節點位置組別                                                           | `SkillTreeNodePosition.group_id`     | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `is_tutorial`                             | INTEGER（boolean） / null | 教學相關旗標；具體使用條件 **UNKNOWN**                                       | —                                    | —                                               | 未輸出角色詳細資料；目前 54 位可遊玩角色皆為 1，其餘 8 位為 null          |
|      | `dominant_hand_type`                      | INTEGER（enum）           | 慣用手分類；見枚舉                                                           | `enums.CharacterHandType`            | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `skill_tree_point_id`                     | TEXT / null               | 技能樹點數資料 ID                                                            | `SkillTreePoint.id`                  | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `bgm_asset_id`                            | TEXT / null               | 背景音樂素材識別碼                                                           | —                                    | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `regular_character_grouping_name_lang_id` | TEXT / null               | 常規角色群組名稱文字 ID；用於角色／公園畫面的本地化群組標籤                  | [`LangCharacter.id`](#langcharacter) | —                                               | 未輸出角色詳細資料；用途 **CONFIRMED**，文字缺失時的 fallback **UNKNOWN** |
|      | `regular_character_grouping_name_eng`     | TEXT / null               | 常規角色群組英文名稱；用於卡片綻放及特訓結果動畫                             | —                                    | —                                               | 未輸出角色詳細資料；用途 **CONFIRMED**                                    |
|      | `search_keyword_lang_ids`                 | TEXT（JSON） / null       | 搜尋關鍵字文字 ID 陣列                                                       | [`LangCharacter.id`](#langcharacter) | —                                               | 未輸出角色詳細資料或養成資料                                              |
|      | `color1`                                  | TEXT / null               | 六位十六進位顏色字串；MainColor，角色主色；用於綻放背景與粒子配色            | —                                    | —                                               | 未輸出角色顏色；用途 **CONFIRMED**，解析失敗的處理 **UNKNOWN**            |
|      | `color2`                                  | TEXT / null               | 六位十六進位顏色字串；SubColor1，角色輔色 1                                  | —                                    | —                                               | 未輸出角色顏色；用途 **CONFIRMED**，解析失敗的處理 **UNKNOWN**            |
|      | `color3`                                  | TEXT / null               | 六位十六進位顏色字串；SubColor2，角色輔色 2；用於綻放粒子配色                | —                                    | —                                               | 未輸出角色顏色；用途 **CONFIRMED**，解析失敗的處理 **UNKNOWN**            |
|      | `color4`                                  | TEXT / null               | 六位十六進位顏色字串；ButtonColor，按鈕用色；用於綻放頁面底部波浪配色        | —                                    | —                                               | 未輸出角色顏色；用途 **CONFIRMED**，解析失敗的處理 **UNKNOWN**            |
|      | `color5`                                  | TEXT / null               | 六位十六進位顏色字串；具體用途 **UNKNOWN**                                   | —                                    | —                                               | 未輸出角色顏色                                                            |
| ✓    | `order`                                   | INTEGER                   | 來源顯示排序值                                                               | —                                    | `characters[].order`                            | —                                                                         |
|      | `regular_character_grouping_ids`          | TEXT（JSON） / null       | 所屬常規角色群組 ID 陣列                                                     | `CharacterGrouping.id`               | —                                               | 未輸出角色詳細資料或養成資料                                              |

## LangCharacter

每筆代表一個角色相關文字 ID 在一種遊戲語言的內容。除名稱外亦包含介紹、粉絲名稱等文字；目前只轉存 Character.name_lang_id 對應的文字。

**CONFIRMED**：主鍵為 `language, id`，目前快照 2412 筆。

| 轉存 | 來源欄位   | 型別        | 意義                                  | 關聯                                | 輸出對應                                      | 備註／未轉存原因     |
| ---- | ---------- | ----------- | ------------------------------------- | ----------------------------------- | --------------------------------------------- | -------------------- |
| ✓    | `language` | TEXT        | 遊戲語言代碼                          | —                                   | `characters[].name 的語言 key`                | 僅讀取設定的六語名稱 |
| ✓    | `id`       | TEXT        | 文字 ID，供角色名稱及其他角色文字引用 | `Character 的文字 ID 欄位 → 本欄位` | `依 Character.name_lang_id 查找`              | 僅讀取設定的六語名稱 |
| ✓    | `text`     | TEXT / null | 該語言的文字內容                      | —                                   | `characters[].name[language]（只取角色名稱）` | 僅讀取設定的六語名稱 |

## 枚舉

以下值由對應 schema 枚舉確認（**CONFIRMED**）：

| 枚舉                       | 數值與定義                                             |
| -------------------------- | ------------------------------------------------------ |
| CharacterPersonalityType   | 0 UNKNOWN；1 COOL；2 SEXY；3 NATURAL；4 CUTE；5 ACTIVE |
| CharacterSdPersonalityType | 0 UNKNOWN；1 TYP000；2 TYP001；3 TYP002                |
| CharacterHandType          | 0 UNKNOWN；1 R；2 L                                    |
