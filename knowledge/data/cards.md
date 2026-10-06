# 卡片資料字典與轉存對照

輸出為 `public/data/cards.json`。角色資料見 [characters.md](characters.md)，成長資料見 [card-growth.md](card-growth.md)。來源與適用快照見 [知識索引](../README.md)。

欄位名稱、SQLite 型別、主鍵、schema 宣告的關聯與轉存對應均為 **CONFIRMED**。用途尚未完整追蹤者另以信心標籤標示；宣告的關聯不等同 SQLite 外鍵約束。`✓` 表示直接輸出或經查表產生輸出，空白表示尚未轉存。

## Card

每筆代表一張卡片。角色 ID 指向角色表；名稱依文字 ID 與遊戲語言查找。成長組別指向一組等級或養成階段資料。

**CONFIRMED**：主鍵為 `id`，目前快照 189 筆。

| 轉存 | 來源欄位                                | 型別                      | 意義                                                          | 關聯                                                       | 輸出對應                                   | 備註／未轉存原因                                                                                |
| ---- | --------------------------------------- | ------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| ✓    | `id`                                    | TEXT                      | 卡片 ID                                                       | —                                                          | `cards[].id`                               | —                                                                                               |
| ✓    | `character_id`                          | TEXT                      | 所屬角色 ID                                                   | [`Character.id`](characters.md#character)                  | `cards[].characterId`                      | —                                                                                               |
| ✓    | `name_lang_id`                          | TEXT                      | 卡片名稱文字 ID                                               | [`LangCard.id`](#langcard)                                 | `cards[].name（依語言查 LangCard）`        | —                                                                                               |
| ✓    | `rarity`                                | INTEGER（enum）           | 稀有度；見枚舉                                                | `enums.CardRarity`                                         | `cards[].rarity`                           | —                                                                                               |
| ✓    | `attribute_type`                        | INTEGER（enum）           | 屬性分類；見枚舉                                              | `enums.CardAttributeType`                                  | `cards[].attributeType`                    | —                                                                                               |
| ✓    | `card_level_group_id`                   | TEXT                      | 等級成長組別                                                  | [`CardLevel.group_id`](card-growth.md#cardlevel)           | `cards[].growth.levelGroupId`              | —                                                                                               |
| ✓    | `performance_permil_multiply`           | INTEGER                   | Performance 三圍權重，千分比整數                              | —                                                          | `cards[].growth.weightsPermil.performance` | —                                                                                               |
| ✓    | `technique_permil_multiply`             | INTEGER                   | Technique 三圍權重，千分比整數                                | —                                                          | `cards[].growth.weightsPermil.technique`   | —                                                                                               |
| ✓    | `sense_permil_multiply`                 | INTEGER                   | Sense 三圍權重，千分比整數                                    | —                                                          | `cards[].growth.weightsPermil.sense`       | —                                                                                               |
| ✓    | `card_level_limit_group_id`             | TEXT                      | 特訓等級上限組別                                              | [`CardLevelLimit.group_id`](card-growth.md#cardlevellimit) | `cards[].growth.levelLimitGroupId`         | —                                                                                               |
|      | `live_passive_skill_id`                 | TEXT                      | 被動技能 ID                                                   | `LivePassiveSkill.id`                                      | —                                          | 未輸出技能、語音、服裝或獎勵資料                                                                |
|      | `live_active_skill_id`                  | TEXT                      | 主動技能 ID                                                   | `LiveActiveSkill.id`                                       | —                                          | 未輸出技能、語音、服裝或獎勵資料                                                                |
|      | `live_special_skill_id`                 | TEXT                      | 特殊技能 ID                                                   | `LiveSpecialSkill.id`                                      | —                                          | 未輸出技能、語音、服裝或獎勵資料                                                                |
| ✓    | `card_potential_group_id`               | TEXT                      | 綻放效果組別                                                  | [`CardPotential.group_id`](card-growth.md#cardpotential)   | `cards[].growth.potentialGroupId`          | —                                                                                               |
| ✓    | `asset_id`                              | TEXT / null               | 卡面素材識別碼                                                | —                                                          | `cards[].assetId`                          | —                                                                                               |
|      | `background_asset_id`                   | TEXT / null               | 背景素材識別欄位；實際用途 **UNKNOWN**                        | —                                                          | —                                          | 用途未確認；目前 189 筆皆為 null                                                                |
|      | `live_skill_character_voice_id`         | TEXT / null               | Live 技能啟動時的候選語音 ID                                  | `CharacterVoice.id`                                        | —                                          | 未輸出語音；用途 **CONFIRMED**，完整抽選機率 **UNKNOWN**                                        |
|      | `skill_tree_connect_effect_id`          | TEXT / null               | 技能樹連結效果 ID                                             | `SkillTreeConnectEffect.id`                                | —                                          | 未輸出技能、語音、服裝或獎勵資料                                                                |
|      | `reward_costume_id`                     | TEXT / null               | 附帶的 Live 服裝獎勵 ID；抽卡精選詳情顯示服裝縮圖             | `Costume.id`                                               | —                                          | 未輸出服裝；顯示用途 **CONFIRMED**，發放條件及首次／重複取得差異 **UNKNOWN**                    |
|      | `reward_sd_costume_id`                  | TEXT / null               | 附帶的 SD 服裝獎勵 ID；抽卡精選詳情顯示服裝縮圖               | `SdCostume.id`                                             | —                                          | 未輸出服裝；顯示用途 **CONFIRMED**，發放條件及首次／重複取得差異 **UNKNOWN**                    |
| ✓    | `asset_type`                            | INTEGER（enum）           | 卡面素材種類；見枚舉                                          | `enums.CardAssetType`                                      | `cards[].assetType`                        | —                                                                                               |
| ✓    | `vertical_anchor_type`                  | INTEGER（enum）           | 卡面垂直定位；見枚舉                                          | `enums.CardVerticalAnchorType`                             | `cards[].verticalAnchorType`               | —                                                                                               |
| ✓    | `horizontal_anchor_type`                | INTEGER（enum）           | 卡面水平定位；見枚舉                                          | `enums.CardHorizontalAnchorType`                           | `cards[].horizontalAnchorType`             | —                                                                                               |
|      | `gacha_animation_character_voice_id`    | TEXT / null               | 抽卡動畫台詞語音 ID                                           | `CharacterVoice.id`                                        | —                                          | 未輸出語音；用途 **CONFIRMED**                                                                  |
|      | `card_detail_character_voice_id`        | TEXT / null               | 卡片放大畫面的詳情語音 ID；持有卡片或畫面允許未持有播放時使用 | `CharacterVoice.id`                                        | —                                          | 未輸出語音；用途 **CONFIRMED**                                                                  |
|      | `is_no_signed_card_message`             | INTEGER（boolean） / null | 抽卡精選卡片詳情的訊息切換旗標                                | —                                                          | —                                          | 未處理簽名卡訊息；切換用途 **CONFIRMED**，true／false 對應內容 **UNKNOWN**                      |
|      | `potential_upgrade1_character_voice_id` | TEXT / null               | 綻放第 1 階段結果語音 ID                                      | `CharacterVoice.id`                                        | —                                          | 未輸出語音；用途 **CONFIRMED**，一次提升多階段的選擇及缺值 fallback **UNKNOWN**                 |
|      | `potential_upgrade2_character_voice_id` | TEXT / null               | 綻放第 2 階段結果語音 ID                                      | `CharacterVoice.id`                                        | —                                          | 未輸出語音；用途 **CONFIRMED**，一次提升多階段的選擇及缺值 fallback **UNKNOWN**                 |
|      | `potential_upgrade3_character_voice_id` | TEXT / null               | 綻放第 3 階段結果語音 ID                                      | `CharacterVoice.id`                                        | —                                          | 未輸出語音；用途 **CONFIRMED**，一次提升多階段的選擇及缺值 fallback **UNKNOWN**                 |
|      | `potential_upgrade4_character_voice_id` | TEXT / null               | 綻放第 4 階段結果語音 ID                                      | `CharacterVoice.id`                                        | —                                          | 未輸出語音；用途 **CONFIRMED**，一次提升多階段的選擇及缺值 fallback **UNKNOWN**                 |
|      | `potential_upgrade5_character_voice_id` | TEXT / null               | 綻放第 5 階段結果語音 ID                                      | `CharacterVoice.id`                                        | —                                          | 未輸出語音；用途 **CONFIRMED**，一次提升多階段的選擇及缺值 fallback **UNKNOWN**                 |
| ✓    | `order`                                 | INTEGER                   | 來源顯示排序值                                                | —                                                          | `cards[].order`                            | —                                                                                               |
|      | `potential_alternative_reward`          | TEXT（JSON） / null       | 重複卡片的綻放替代獎勵；抽卡結果及卡片交換預覽顯示            | `common.Reward`                                            | —                                          | 未輸出獎勵；顯示用途 **CONFIRMED**；達最大綻放時取代點數為 **LIKELY**，完整發放門檻 **UNKNOWN** |
|      | `acquire_reward`                        | TEXT（JSON） / null       | 取得卡片附加獎勵；抽卡結果及卡片交換預覽顯示縮圖與數量        | `common.Reward`                                            | —                                          | 未輸出獎勵；顯示用途 **CONFIRMED**，發放條件及首次／重複取得差異 **UNKNOWN**                    |

## LangCard

每筆代表一個文字 ID 在一種遊戲語言的卡片名稱。轉換時以 Card.name_lang_id 和 language 查找 text。

**CONFIRMED**：主鍵為 `language, id`，目前快照 1134 筆。

| 轉存 | 來源欄位   | 型別        | 意義             | 關聯                         | 輸出對應                    | 備註／未轉存原因     |
| ---- | ---------- | ----------- | ---------------- | ---------------------------- | --------------------------- | -------------------- |
| ✓    | `language` | TEXT        | 遊戲語言代碼     | —                            | `cards[].name 的語言 key`   | 僅讀取設定的六語名稱 |
| ✓    | `id`       | TEXT        | 文字 ID          | `Card.name_lang_id → 本欄位` | `依 Card.name_lang_id 查找` | 僅讀取設定的六語名稱 |
| ✓    | `text`     | TEXT / null | 該語言的卡片名稱 | —                            | `cards[].name[language]`    | 僅讀取設定的六語名稱 |

## 枚舉與素材

以下值由對應 schema 枚舉確認（**CONFIRMED**）：

| 枚舉                     | 數值與定義                                             |
| ------------------------ | ------------------------------------------------------ |
| CardRarity               | 0 UNKNOWN；3 三星；4 四星；5 五星                      |
| CardAttributeType        | 0 UNKNOWN；1 ATTRIBUTE_1；2 ATTRIBUTE_2；3 ATTRIBUTE_3 |
| CardAssetType            | 0 UNKNOWN；1 IMAGE；2 IMAGE_AND_MOVIE                  |
| CardVerticalAnchorType   | 0 UNKNOWN；1 TOP；2 CENTER；3 BOTTOM                   |
| CardHorizontalAnchorType | 0 UNKNOWN；1 LEFT；2 CENTER；3 RIGHT                   |

**CONFIRMED**：IMAGE_AND_MOVIE 表示含影片素材的卡面；垂直與水平定位枚舉分別控制卡面的上下及左右定位。

素材 ID 保存來源識別碼，與其他資料表的外鍵不同。

`potential_alternative_reward` 與 `acquire_reward` 的結構型別為 `common.Reward`，包含 resource_type、resource_id、quantity；資源種類決定 resource_id 的解讀，schema 未將此欄宣告為單一表的外鍵。獎勵發放條件尚未確認。
