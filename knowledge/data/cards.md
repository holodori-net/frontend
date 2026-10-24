# 卡片資料字典與轉換對照

`transformCards(database)` 回傳 `CardData[]`。角色資料見 [characters.md](characters.md)，成長資料見 [card-growth.md](card-growth.md)，卡片技能見 [card-skills.md](card-skills.md)。來源與適用快照見 [知識索引](../README.md)。

欄位名稱、SQLite 型別、主鍵、schema 宣告的關聯與轉換對應均為 **CONFIRMED**。用途尚未完整追蹤者另以信心標籤標示；宣告的關聯不等同 SQLite 外鍵約束。`✓` 表示已直接轉換或經查表產生回傳值，空白表示尚未轉換。

## 卡片詳細頁

`readCardDetailIndex()` 回傳 `{ cardIds: string[] }`，`readCardDetail(id)` 回傳該卡的 `CardDetailPayload`；未找到 ID 時回傳 null。索引輸出為 `/data/card-details.json`，單卡資料輸出為 `/data/cards/{id}.json`。Reader 在每個 process 重用轉換來源，並只投影該卡所需的六語名稱、技能、服裝、Connect 與養成資料。

詳細頁路徑為 `/{siteLocale}/{gameLocale}/cards/{id}`，預生成滿養成資訊與卡片 SEO。卡圖使用原尺寸的 `img_card_full_{assetId}.webp`。寬螢幕左側排列遊戲素材標題牌、卡框中的卡圖、衣裝縮圖與技能及 Connect；右側為養成控制及特殊、主動、被動技能。標題保留卡名與放大的角色名，角色掛飾取自卡片的角色素材 ID，沿標題與卡框左側排列；標題使用該角色的 `color4`，搭配原始亮點、波紋、內側光暈及外框，白字保留深色陰影。手機依序顯示標題與卡圖、養成、衣裝與 Connect、卡片技能。等級 Slider 涵蓋卡片完整養成範圍，旁邊合併顯示最低所需特訓及階段上限；綻放以列出各階段新增效果的下拉選單調整，收起時顯示緊湊的階段與效果摘要，展開後的技能升級選項包含目標等級的完整技能描述。三圍由 `CardDetailParameters` 以圖示、名稱及放大數值直式排列，增加列高，右側以更大的數字顯示合計；列表沿用 `CardParameters` 的水平加總算式。衣裝縮圖與 Connect 圖同為 112px，兩區使用圖示標題頁籤銜接圓角內容框，搭配中性框線；標題使用淡主題色背景與一般文字及圖示色，內容區與其他面板使用相同背景。各類卡片技能與 Connect 顯示全部來源等級，目前等級依養成強調，其他等級使用較淡文字；Connect 共用的範圍圖跟隨目前等級，窄螢幕在圖下方排列描述。養成選擇在頁面記憶體中保存；同卡切換語言保留選擇，重新載入、換卡或離開後重新進入使用滿養成。三圍與技能等級計算見 [卡片成長資料](card-growth.md#詳細頁的養成計算)。

離線設定的 `cards` 保存列表，`cardDetails` 獨立保存選定語言組合的全部詳細頁、Nuxt payload 與單卡計算資料。兩者可分別選擇；下載成功後替換快照，失敗保留既有快照。

## Card

每筆代表一張卡片。角色 ID 指向角色表；名稱依文字 ID 與遊戲語言查找。成長組別指向一組等級或養成階段資料。

**CONFIRMED**：主鍵為 `id`，目前快照 196 筆。

| 轉換 | 來源欄位                                | 型別                      | 意義                                                          | 關聯                                                       | 回傳對應                                   | 備註／未轉換原因                                                                                |
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
| ✓    | `live_passive_skill_id`                 | TEXT                      | 被動技能 ID                                                   | `LivePassiveSkill.id`                                      | `cards[].livePassiveSkillId`               | 保留來源非 nullable 關聯                                                                        |
| ✓    | `live_active_skill_id`                  | TEXT                      | 主動技能 ID                                                   | `LiveActiveSkill.id`                                       | `cards[].liveActiveSkillId`                | 保留來源非 nullable 關聯                                                                        |
| ✓    | `live_special_skill_id`                 | TEXT                      | 特殊技能 ID                                                   | `LiveSpecialSkill.id`                                      | `cards[].liveSpecialSkillId`               | 保留來源非 nullable 關聯                                                                        |
| ✓    | `card_potential_group_id`               | TEXT                      | 綻放效果組別                                                  | [`CardPotential.group_id`](card-growth.md#cardpotential)   | `cards[].growth.potentialGroupId`          | —                                                                                               |
| ✓    | `asset_id`                              | TEXT / null               | 卡面素材識別碼                                                | —                                                          | `cards[].assetId`                          | —                                                                                               |
|      | `background_asset_id`                   | TEXT / null               | 背景素材識別欄位；實際用途 **UNKNOWN**                        | —                                                          | —                                          | 用途未確認；目前 196 筆皆為 null                                                                |
|      | `live_skill_character_voice_id`         | TEXT / null               | Live 技能啟動時的候選語音 ID                                  | `CharacterVoice.id`                                        | —                                          | 未回傳語音；用途 **CONFIRMED**，完整抽選機率 **UNKNOWN**                                        |
| ✓    | `skill_tree_connect_effect_id`          | TEXT / null               | 技能樹連結效果 ID                                             | `SkillTreeConnectEffect.id`                                | `cards[].skillTreeConnectEffectId`         | 保留 nullable 關聯                                                                              |
| ✓    | `reward_costume_id`                     | TEXT / null               | 附帶的 Live 服裝獎勵 ID；抽卡精選詳情顯示服裝縮圖             | `Costume.id`                                               | `cards[].rewardCostumeId`                  | 保留 null；顯示用途 **CONFIRMED**，發放條件及首次／重複取得差異 **UNKNOWN**                     |
|      | `reward_sd_costume_id`                  | TEXT / null               | 附帶的 SD 服裝獎勵 ID；抽卡精選詳情顯示服裝縮圖               | `SdCostume.id`                                             | —                                          | 未回傳服裝；顯示用途 **CONFIRMED**，發放條件及首次／重複取得差異 **UNKNOWN**                    |
| ✓    | `asset_type`                            | INTEGER（enum）           | 卡面素材種類；見枚舉                                          | `enums.CardAssetType`                                      | `cards[].assetType`                        | —                                                                                               |
| ✓    | `vertical_anchor_type`                  | INTEGER（enum）           | 卡面垂直定位；見枚舉                                          | `enums.CardVerticalAnchorType`                             | `cards[].verticalAnchorType`               | —                                                                                               |
| ✓    | `horizontal_anchor_type`                | INTEGER（enum）           | 卡面水平定位；見枚舉                                          | `enums.CardHorizontalAnchorType`                           | `cards[].horizontalAnchorType`             | —                                                                                               |
|      | `gacha_animation_character_voice_id`    | TEXT / null               | 抽卡動畫台詞語音 ID                                           | `CharacterVoice.id`                                        | —                                          | 未回傳語音；用途 **CONFIRMED**                                                                  |
|      | `card_detail_character_voice_id`        | TEXT / null               | 卡片放大畫面的詳情語音 ID；持有卡片或畫面允許未持有播放時使用 | `CharacterVoice.id`                                        | —                                          | 未回傳語音；用途 **CONFIRMED**                                                                  |
|      | `is_no_signed_card_message`             | INTEGER（boolean） / null | 抽卡精選卡片詳情的訊息切換旗標                                | —                                                          | —                                          | 未處理簽名卡訊息；切換用途 **CONFIRMED**，true／false 對應內容 **UNKNOWN**                      |
|      | `potential_upgrade1_character_voice_id` | TEXT / null               | 綻放第 1 階段結果語音 ID                                      | `CharacterVoice.id`                                        | —                                          | 未回傳語音；用途 **CONFIRMED**，一次提升多階段的選擇及缺值 fallback **UNKNOWN**                 |
|      | `potential_upgrade2_character_voice_id` | TEXT / null               | 綻放第 2 階段結果語音 ID                                      | `CharacterVoice.id`                                        | —                                          | 未回傳語音；用途 **CONFIRMED**，一次提升多階段的選擇及缺值 fallback **UNKNOWN**                 |
|      | `potential_upgrade3_character_voice_id` | TEXT / null               | 綻放第 3 階段結果語音 ID                                      | `CharacterVoice.id`                                        | —                                          | 未回傳語音；用途 **CONFIRMED**，一次提升多階段的選擇及缺值 fallback **UNKNOWN**                 |
|      | `potential_upgrade4_character_voice_id` | TEXT / null               | 綻放第 4 階段結果語音 ID                                      | `CharacterVoice.id`                                        | —                                          | 未回傳語音；用途 **CONFIRMED**，一次提升多階段的選擇及缺值 fallback **UNKNOWN**                 |
|      | `potential_upgrade5_character_voice_id` | TEXT / null               | 綻放第 5 階段結果語音 ID                                      | `CharacterVoice.id`                                        | —                                          | 未回傳語音；用途 **CONFIRMED**，一次提升多階段的選擇及缺值 fallback **UNKNOWN**                 |
| ✓    | `order`                                 | INTEGER                   | 來源顯示排序值                                                | —                                                          | `cards[].order`                            | —                                                                                               |
|      | `potential_alternative_reward`          | TEXT（JSON） / null       | 重複卡片的綻放替代獎勵；抽卡結果及卡片交換預覽顯示            | `common.Reward`                                            | —                                          | 未回傳獎勵；顯示用途 **CONFIRMED**；達最大綻放時取代點數為 **LIKELY**，完整發放門檻 **UNKNOWN** |
|      | `acquire_reward`                        | TEXT（JSON） / null       | 取得卡片附加獎勵；抽卡結果及卡片交換預覽顯示縮圖與數量        | `common.Reward`                                            | —                                          | 未回傳獎勵；顯示用途 **CONFIRMED**，發放條件及首次／重複取得差異 **UNKNOWN**                    |

## 技能樹 Connect 範圍

**CONFIRMED**：Connect 效果由 `Card.skill_tree_connect_effect_id` 關聯 `SkillTreeConnectEffect.id`，再以 `skill_tree_connect_effect_extent_group_id` 查詢 `SkillTreeConnectEffectExtent.group_id`。後者每列保存一個 `(position_x, position_y)`，可用於重建範圍形狀。`SkillTreeConnectEffect` 的主鍵為 `(id, level)`；`SkillTreeConnectEffectExtent` 的主鍵為 `(group_id, position_x, position_y)`。卡片轉換保留 nullable 的 `skillTreeConnectEffectId`；列表 payload 為被卡片引用的效果提供各等級的 extent group ID 與完整六語描述，並按 group ID 去重範圍座標。

`transformSkillTreeConnectEffects(database)` 依效果 ID、等級排序，回傳效果欄位及 `LangGeneratedSkillTreeConnectEffect` 六語描述，並依 group ID、y、x 排序範圍位置。列表 reader 只投影被卡片引用的效果與所需範圍；原始效果欄位留在 server，來源描述的 `[highlight]` 標記於顯示時移除。描述直接使用來源六語翻譯，不另行推導 catalog。缺少非 null 的效果、非空 extent group 或設定語言翻譯時，生成失敗並保留來源列資訊。Connect 效果描述使用遊戲語言，介面標籤使用網站語言。

轉換欄位對照：

| 轉換 | 來源欄位                                    | 型別            | 意義              | 關聯                                     | 回傳對應                                            | 備註／未轉換原因                     |
| ---- | ------------------------------------------- | --------------- | ----------------- | ---------------------------------------- | --------------------------------------------------- | ------------------------------------ |
| ✓    | `id`                                        | TEXT            | Connect 效果 ID   | `Card.skill_tree_connect_effect_id`      | `effects[id]`                                       | 依 level 排序                        |
| ✓    | `level`                                     | INTEGER         | 效果等級          | —                                        | `effects[id][].level`                               | —                                    |
| ✓    | `connect_effect_type`                       | INTEGER（enum） | 效果類型          | —                                        | `effects[id][].connectEffectType`                   | 原始欄位保留於 server                |
| ✓    | `skill_tree_connect_effect_extent_group_id` | TEXT            | 範圍組 ID         | `SkillTreeConnectEffectExtent.group_id`  | `effects[id][].skillTreeConnectEffectExtentGroupId` | 列表 payload 以 `extentGroupId` 投影 |
| ✓    | `effect_permil_up`                          | TEXT / null     | 效果提升千分比    | —                                        | `effects[id][].effectPermilUp`                      | 原始欄位保留於 server                |
| ✓    | `additional_skill_tree_effect_id`           | TEXT / null     | 附加技能樹效果 ID | —                                        | `effects[id][].additionalSkillTreeEffectId`         | 原始欄位保留於 server                |
| ✓    | `target_skill_tree_effect_id`               | TEXT / null     | 目標技能樹效果 ID | —                                        | `effects[id][].targetSkillTreeEffectId`             | 原始欄位保留於 server                |
| ✓    | `target_node_type`                          | INTEGER / null  | 目標節點類型      | —                                        | `effects[id][].targetNodeType`                      | 原始欄位保留於 server                |
| ✓    | `target_node_grade`                         | INTEGER / null  | 目標節點階級      | —                                        | `effects[id][].targetNodeGrade`                     | 原始欄位保留於 server                |
| ✓    | `description_lang_id`                       | TEXT            | 描述文字 ID       | `LangGeneratedSkillTreeConnectEffect.id` | `effects[id][].description[language]`               | 讀取設定的六語翻譯                   |

`SkillTreeConnectEffectExtent` 依範圍組 ID 聚合座標，列表 payload 對重複 group 僅保存一份：

| 轉換 | 來源欄位     | 型別    | 意義      | 關聯 | 回傳對應                      | 備註／未轉換原因 |
| ---- | ------------ | ------- | --------- | ---- | ----------------------------- | ---------------- |
| ✓    | `group_id`   | TEXT    | 範圍組 ID | —    | `connectExtents[groupId]`     | 依 group ID 分組 |
| ✓    | `position_x` | INTEGER | X 座標    | —    | `connectExtents[groupId][].x` | 依 x 排序        |
| ✓    | `position_y` | INTEGER | Y 座標    | —    | `connectExtents[groupId][].y` | 依 y 排序        |

來源 schema 見 [Connect 效果](https://github.com/holodori-net/android-protos/blob/main/descriptors/entity/master/skill_tree_connect_effect.gen.proto)與[範圍座標](https://github.com/holodori-net/android-protos/blob/main/descriptors/entity/master/skill_tree_connect_effect_extent.gen.proto)。[連結 API](https://github.com/holodori-net/android-protos/blob/main/descriptors/rpc/api/skill_tree.gen.proto) 的 `SkillTreeConnectNodeRequest` 使用 `character_id`、`node_group_id` 與 `card_id`；[使用者技能樹](https://github.com/holodori-net/android-protos/blob/main/descriptors/entity/transaction/user_character_skill_tree.gen.proto)亦保存連結的節點群組與卡片 ID。

### 百鬼あやめ「鬼神流・ぷかぷかリゾート」

**CONFIRMED**：2026-10-21 查詢本機 `master_version=452bd7acfd1b9f90cc85d9978aea55b1a6bf6c2cddaff470c640462830c8c00d`，卡片 ID 為 `card-00010-5-uniq-0069-00`，效果 ID 為 `skill_tree_connect_effect-skill_tree_effect_up-skill_tree_connect_effect_extent-card_area-001-rare_5`。Lv. 1 與 Lv. 2 皆引用 `skill_tree_connect_effect_extent-card_area-001`，包含六個座標：

```text
(-1, -1), (0, -1), (-1, 0), (1, 0), (-1, 1), (0, 1)
```

以 `★` 標示原點 `(0, 0)`、`■` 標示上述座標，重建結果與卡片介紹的 5×5 預覽一致：

```text
· · · · ·
· ■ ■ · ·
· ■ ★ ■ ·
· ■ ■ · ·
· · · · ·
```

**CONFIRMED**：本機 `SkillTreeNodePosition` 的 `group_id='tree-model-002'` 顯示 R-001 `(null, 1)`（leader、type 2）、B-001 `(1, null)`（card、type 3）、G-001 `(null, -1)`（ALL_MEMBER、type 4）與 Y-001 `(-1, null)`（content、type 5）；null 軸座標視為 0。官方[棋盤圖](https://www.hololive-dreams.com/_vercel/image?q=100&url=_astro%2Fimg_skill2.CUk0O-7C.png&w=3840)顯示紅在上、藍在右、綠在下、黃在左，確認棋盤 x 軸向右、y 軸向上；Connect 範圍圖沿用此方向。**LIKELY**：範圍座標相對於放置卡片的 Connect 節點，將節點位置加上座標偏移可取得受影響位置；此語意尚未從 runtime 完整追蹤。

`buildConnectGraphGrid(positions)` 使用固定 5×5 網格，x 由左至右、y 由下至上。原點 `(0, 0)` 預設置中；單側超過兩格時，範圍與原點一起向對側平移一格。兩軸分別計算位移，星號跟隨原點格子。列表將網格置於 7rem 欄位，效果描述在右側，空間不足時換行；沒有 Connect 效果的卡片保留對齊空間但不顯示內容。圖形由離線 payload 生成 inline SVG，不依賴遠端素材。

**CONFIRMED**：此效果 `connect_effect_type=1`，枚舉為 `SKILL_TREE_CONNECT_EFFECT_TYPE_SKILL_TREE_EFFECT_UP`。Lv. 1／2 的 `effect_permil_up` 分別為字串 `1100`／`1600`，來源描述對應範圍內 Holomem Board 效果提升 110%／160%。同一快照的 40 筆效果共用 17 組範圍、89 筆座標；沒有 `(0, 0)` 的範圍列，且同一效果 ID 的不同等級皆使用相同範圍。

可於 `.data/master.sqlite` 唯讀執行下列查詢，取得此卡 Lv. 1 的範圍：

```sql
SELECT extent.position_x, extent.position_y
FROM Card AS card
JOIN SkillTreeConnectEffect AS effect
  ON effect.id = card.skill_tree_connect_effect_id
  AND effect.level = 1
JOIN SkillTreeConnectEffectExtent AS extent
  ON extent.group_id = effect.skill_tree_connect_effect_extent_group_id
WHERE card.id = 'card-00010-5-uniq-0069-00'
ORDER BY extent.position_y, extent.position_x;
```

### 範圍形狀與方向

**CONFIRMED**：目前快照有 17 種不同座標範圍；以原點為中心合併 90° 旋轉變體後，共有 7 類形狀。`SkillTreeConnectEffectExtent` 只有 group ID 與 x、y 座標，方向依範圍相對於原點的幾何分布分類。下表省略 group ID 的 `skill_tree_connect_effect_extent-` 前綴；格數不含原點，形狀名稱為辨識用分類。

| 範圍 ID                    | 形狀       | 方向   | 格數 |
| -------------------------- | ---------- | ------ | ---- |
| `card_area-001`            | 矩形加側格 | 偏左   | 6    |
| `card_area-002`            | 半菱形     | 左     | 8    |
| `card_area-003`            | 單向直線   | 右     | 3    |
| `card_area-004`            | L 形       | 左＋上 | 4    |
| `center_area-001`          | 外側十字   | 上     | 5    |
| `center_area-002`          | 外側十字   | 右     | 5    |
| `center_area-003`          | 外側十字   | 左     | 5    |
| `center_area-004`          | L 形       | 左＋下 | 4    |
| `center_area-005`          | 外側十字   | 下     | 5    |
| `content_area-001`         | 矩形加側格 | 偏右   | 6    |
| `content_area-002`         | 半菱形     | 右     | 8    |
| `content_area-003`         | 單向直線   | 左     | 3    |
| `content_area-004`         | L 形       | 右＋下 | 4    |
| `general_purpose_area-001` | 菱形       | 全周   | 12   |
| `leader_area-001`          | 雙向直線   | 上＋下 | 4    |
| `leader_area-002`          | 單向直線   | 下     | 3    |
| `leader_area-003`          | L 形       | 右＋上 | 4    |

### 範圍圖篩選

**CONFIRMED**：`buildCardConnectFilterCatalog(payload)` 依卡片引用效果的全部等級建立範圍索引，按完整 extent group ID 去重排序，保留圖形方向；已知範圍提供形狀與方向標籤，未命名範圍仍顯示圖形、編號及格數。Connect 篩選以 PrimeVue Dialog 提供圖案複選，重用固定 5×5 預覽；320px 使用兩欄，網格獨立捲動，全選、清除與完成操作保持可見。勾選即時套用，關閉保留選取。

圖案之間採 OR，與其他篩選採 AND；未選圖案不限，全選圖案只保留有 Connect 的卡片。每張卡任一來源等級符合所選範圍即保留，與顯示等級及資訊開關獨立。各圖案數量套用其他篩選、排除 Connect 自身，以唯一卡片計數；零張選項仍可選，視窗底部顯示目前結果總數。`CardListConditions.connect` 保存所選完整 extent group ID；重複的 `connect` query 參數依 ID 排序去重，忽略未知值，空選取省略。網址重載、瀏覽紀錄、語言切換與離線使用沿用共用條件流程；重設篩選清除 Connect 選取並保留顯示偏好。

## LangCard

每筆代表一個文字 ID 在一種遊戲語言的卡片名稱。轉換時以 Card.name_lang_id 和 language 查找 text。

**CONFIRMED**：主鍵為 `language, id`，目前快照 1176 筆。

| 轉換 | 來源欄位   | 型別        | 意義             | 關聯                         | 回傳對應                    | 備註／未轉換原因     |
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

### 列表文字與卡圖版型

**CONFIRMED**：`LangClientKeyConst.Card` 的 `CardAttributeType1`／`2`／`3` 初始化常數對應 `LangClientCommon.client_id`，正式文字如下：

| CardAttributeType | client_id         | 繁體中文 | English | 日本語   |
| ----------------- | ----------------- | -------- | ------- | -------- |
| 1                 | `418372072562688` | 可愛     | Cute    | キュート |
| 2                 | `418372072562689` | 清純     | Pure    | ピュア   |
| 3                 | `418372072562690` | 快樂     | Happy   | ハッピー |

三圍文字同樣取自 `LangClientCommon`：

| 列表欄位    | client_id         | 繁體中文 | English     | 日本語         |
| ----------- | ----------------- | -------- | ----------- | -------------- |
| performance | `544214034735104` | 表現力   | Performance | パフォーマンス |
| technique   | `544393282510848` | 技巧     | Technique   | テクニック     |
| sense       | `544462232674304` | 品味     | Sense       | センス         |

來源：`.data/master.sqlite` 的 `LangClientCommon(language, client_id, text)`；`../extraction/work/decompile/05-annotate-decompiled-code/annotated-csharp/Vision.Common.Core/Vision/Common/Localization/LangClientKeyConst.cs` 的 `Card` 靜態初始化及對應 `libil2cpp.so` 常數；`methods.json` 記錄其 RVA `0xE7AA9E8`（file offset `0xE7A69E8`）。介面依網站語言顯示，卡名與角色名依遊戲語言顯示。

完整卡圖使用 `https://assets.holodori.net/cdn/img_card_full_{assetId}/Texture2D/img_card_full_{assetId}.thumb-640-v1.webp` 的 640×360 縮圖，以 16:9 顯示。直式卡圖使用 `https://assets.holodori.net/cdn/img_card_vert_{assetId}/Texture2D/img_card_vert_{assetId}.webp`，以 256:366 顯示。素材用途與 URL 由 `shared/game-data/card-list.ts` 的 `getCardImageUrl()` 管理，保留素材 ID 的前導零。卡圖以單一 `src` 載入，並共用 `useImageLoading` 處理 Skeleton、失敗占位及快取圖片狀態。

**CONFIRMED**：2026-10-23 讀取 `04014-5-uniq-0094-00` 的 CDN WebP 檔頭，[縮圖](https://assets.holodori.net/cdn/img_card_full_04014-5-uniq-0094-00/Texture2D/img_card_full_04014-5-uniq-0094-00.thumb-640-v1.webp)為 640×360、49,850 bytes，原圖為 2048×1152、2,178,246 bytes。

**CONFIRMED**：`06003-5-uniq-0091-00` 來源直式卡圖尺寸為 256×366。卡片頁兩種版型皆使用完整可用寬度，左右各保留 1rem 頁邊；標題與篩選、顯示控制面板置中，最大寬度為 100rem。直式版型每列一張，96px 寬卡圖置左，資訊置右並靠上排列。所有已選群組在同一橫列等寬排列，基礎資訊的已選子項集中於同一欄；每欄至少 12rem、欄距 1rem，空間足夠時等分餘寬。欄位順序依選取順序，個別卡片缺少資料時保留其欄位位置。所有欄位超出可用寬度時，整個列表共用可鍵盤操作的橫向捲動區，維持上下卡片對齊；卡列高度依卡圖或最長資訊內容決定。完整版型維持圖片在上、資訊在下；兩種版型皆使用水平三圍加總算式。兩種版型載入時均顯示 skeleton，偏好減少動態效果時停止其動畫；載入完成後移除，失敗時保留文字及占位。完整卡圖尺寸案例見下方素材記錄。

**CONFIRMED**：「篩選與排序」與「卡片顯示」面板預設皆展開；各標題列提供同樣式的 `RotateCcw` 圖示按鈕，分別重設對應設定，保留本地化提示與可存取名稱。收合時仍可重設，並保留面板收合狀態。重設按鈕寬 56px，填滿標題列高度且至少 44px 高；圖示為 20px。

**CONFIRMED**：列表的「卡片顯示」提供版型及基礎資訊、被動技能、主動技能、特殊技能、隊長服裝技能、Connect 六個群組；摘要計算已選群組數。基礎資訊包含可獨立選取的卡名、角色名、三圍與合計。資訊選項使用緊湊的小圓角 PrimeVue Button，以 primary 色表示選取、secondary outlined 樣式表示未選，並提供 aria-pressed。各群組名稱左側以圓形 Badge 顯示共用排序號，未選時顯示「−」。基礎資訊、三類卡片技能與 Connect 使用 PrimeVue InputGroup 將名稱、排序號與子項按鈕相連；群組內高度、字級與內距一致，只有外側保留小圓角。所有選項共用同一層靠上排列，基本高度為 32px；基礎資訊子項依內容寬度排列，空間不足時換行。技能群組依可用寬度整組換行；窄螢幕允許技能名稱折行，等級 chip 維持並排。預設開啟一般資訊，三類卡片技能只選 Lv. 2，Connect 選取所有可用等級；各等級可獨立選取。關閉時移除對應內容與間距。全部關閉時只顯示填滿卡片寬度的卡圖、屬性與星級，保留所選版型比例及可存取卡名；直式純卡圖每列一張、靠左排列，卡片最大寬度為 256px。資訊項目定義由 `shared/game-data/card-list.ts` 的 `CARD_LIST_FIELDS` 管理；`useCardFields` 以 `holodori-card-fields` 保存 `{ fields, skillLevels }` JSON 物件，`fields` 保存群組與組內選取順序，基礎資訊成員連續排列，空陣列表示純卡圖；`skillLevels` 保存各技能已選等級。既有偏好保留選取項目，以最早的基礎資訊項目決定群組位置，組內維持選取順序；舊版陣列的三類卡片技能使用 Lv. 2，已選 Connect 使用所有可用等級。缺少 `skillLevels.connectEffect` 的舊 JSON 補空選取，不套用新預設或更改既有欄位與技能等級。兩種版型的基礎資訊與各技能群組都只占一個排序位置。新增部分子項保留群組位置，全部清除後再選取移至最後；技能等級遞增排列。顯示偏好跨語言共用，搜尋與排序仍使用完整列表資料。「重設顯示」重新套用目前版本的預設版型、資訊項目、技能等級與順序並儲存偏好，保留篩選、網址與面板收合狀態。

**CONFIRMED**：`06003-5-uniq-0091-00`、`00034-5-uniq-0090-00` 與 `00001-3-nrml-0000-00` 的來源完整卡圖尺寸均為 2048×1152。每張圖的 RGBA8 像素資料為 9 MiB。

排序方向使用 Lucide 圖示表示目前狀態：升冪為 `ArrowUpNarrowWide`、降冪為 `ArrowDownWideNarrow`。版型使用兩個並排的圖示按鈕，完整卡圖為 `SquareText`、直式卡圖為 `LayoutList`；選取項使用 primary 色，未選項使用 secondary outlined 樣式，並以 `aria-pressed` 表達選取狀態。按鈕保留本地化的文字提示與可存取名稱；排序沿用 query，版型沿用 `holodori-card-layout` 偏好。

### 三圍與屬性圖示

**CONFIRMED**：APK 圖集包含以下 Sprite；三圍為透明底白色字母，屬性使用彩色圓形圖示。尺寸為圖集中裁切後的 WebP 像素大小。

| 用途      | Sprite 名稱                   | 尺寸    | 圖案           |
| --------- | ----------------------------- | ------- | -------------- |
| 表現力    | `ui_999_ico_performance`      | 110×106 | P              |
| 技巧      | `ui_999_ico_technique`        | 110×106 | T              |
| 品味      | `ui_999_ico_sense`            | 101×98  | S              |
| 可愛（1） | `ui_999_ico_element_cute_cl`  | 128×128 | 粉紅心形       |
| 清純（2） | `ui_999_ico_element_pure_cl`  | 128×128 | 綠色葉形       |
| 快樂（3） | `ui_999_ico_element_happy_cl` | 128×128 | 黃橙色旋轉圖案 |

素材來源：[APK 索引](https://assets.holodori.net/apk/index.json) 的 [主要圖示圖集](https://assets.holodori.net/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/index.json)。`files[].objectName` 對應 Sprite 名稱，`files[].path` 相對於該圖集目錄；來源 WebP 位於 `/srv/docker/holodori/public/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/images/`，保留 Sprite 的 object ID 檔名。另有 [陰影圖集](https://assets.holodori.net/apk/bundle/77297a5b58f9376da1f0bb5542e322c2.bundle/index.json)，名稱後綴為 `_shadow`。

客戶端對應：`../extraction/work/decompile/05-annotate-decompiled-code/annotated-csharp/Vision.Common.Core/Vision/Common/AddressDefinition.cs` 的 `LocalSpriteAtlas`；屬性由 `Vision.Common/Vision/Common/CardAttributeTypeIcon.cs` 的 `Set` 選取。屬性 1／2／3 引用的靜態欄位 offset 分別為 8120／8168／8144，對應 `cute_cl`／`pure_cl`／`happy_cl`。觀察日期為 2026-10-14。

前端 URL 對照集中於 `shared/game-data/card-icons.ts`。卡片上的屬性與三圍使用圖示；兩種版型共用「圖示 數值 + 圖示 數值 + 圖示 數值 = 合計」算式，完整版型於圖片下方呈現，直式版型放在圖片右側的三圍欄。窄螢幕與缺圖文字按數值項目換行。篩選與三圍排序選項保留圖示及文字。`CardListIcon` 提供名稱、tooltip、尺寸選擇及載入失敗時的文字 fallback；三圍圖示使用透明背景，亮模式顯示黑色、暗模式顯示白色。

### 動態卡面與簽名影片

**CONFIRMED**：遊戲的 `AutographedCardData` 分別保存 ImageAddress、MovieAddress 與 AutographAddress。`AutographedCardDataFactory.HasMovieAsset()` 以 `CardAssetType.ImageAndMovie` 判斷影片卡；`SelectMovieAddress(card, isPotentialUpgradeMax)` 依是否滿綻放選擇 `GetMovieLimitBreakMaxAddress()` 或 `GetMovieLimitBreakNotMaxAddress()`。簽名另由 `GetSignMovieAddress()` 載入。

`AutographedCard` 使用 `_cardPlayer` 與 `_autographePlayer` 分開播放；`ToggleShowAutograph()` 控制簽名顯示。`GetAutographDelaySeconds()` 回傳 `max(0, 卡面影片長度 − 簽名影片長度)`，卡面循環時重新準備簽名播放。

**CONFIRMED**：白上吹雪 `00006-5-uniq-0074-00` 的 CDN 索引列出以下三支來源影片，均有 `VideoClip/*.webm` 輸出。原始格式為 USM；簽名來源包含 `@SFV` 影像與 `@ALP` alpha 串流。簽名 WebM 的 HTTP Range 請求回傳 `206`、`video/webm`，檔頭包含 `V_VP9` 與 `AlphaMode=1`。

| 素材       | 來源索引                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 卡面版本 0 | [mov_card_full_0_00006-5-uniq-0074-00.usm](https://assets.holodori.net/cdn/mov_card_full_0_00006-5-uniq-0074-00.usm/index.json) |
| 卡面版本 1 | [mov_card_full_1_00006-5-uniq-0074-00.usm](https://assets.holodori.net/cdn/mov_card_full_1_00006-5-uniq-0074-00.usm/index.json) |
| 簽名       | [mov_card_sign_00006-5-uniq-0074-00.usm](https://assets.holodori.net/cdn/mov_card_sign_00006-5-uniq-0074-00.usm/index.json)     |

**CONFIRMED**：`GetMovieLimitBreakMax`（ARM64 RVA `0xEAE0D18`）的 slot `0x10CDE208` 經 ELF RELATIVE relocation 指向 literal `0x110ACF68`（`mov_card_full_1_{0}.usm`）；`GetMovieLimitBreakNotMax`（`0xEAE0DBC`）的 slot `0x10CDE210` 指向 `0x110ACF60`（`mov_card_full_0_{0}.usm`）。因此滿綻放使用版本 1，其他階段使用版本 0。本機 196 張卡中，88 張 `assetType=2` 的卡片均可於 CDN 索引找到上述三種影片；其餘 108 張為 `assetType=1`。

**CONFIRMED**：簽名影片片尾包含淡出；`GachaCharacterCardMovieSequence` 的靜態揭示呼叫 `PauseAtTimes(8.00000000023283, 8.0)`，以簽名第 8 秒作為完整簽名停格。白上吹雪來源 WebM 為 30 fps、272 格，最後 8 格的 alpha 為零。

影片 URL 由 `getCardMovieUrl()` 集中產生，格式為 `https://assets.holodori.net/cdn/{sourceName}/VideoClip/{sourceName 去除 .usm}.webm`。單卡 payload 的 `card.assetType` 保留來源數值；列表 payload 沿用靜態卡圖欄位。

詳細頁保留靜態 `img_card_full_{assetId}.webp` 作為初始卡面及影片失敗時的 fallback。`assetType=2` 的卡片於 mounted 後載入影片，以「動態卡面」「顯示簽名」分別控制兩層，預設皆開啟；偏好減少動態效果時，新卡預設關閉動畫，仍可手動啟用。關閉動畫時，簽名停在遊戲完整簽名的 8 秒影格；較短影片限制於可用範圍。卡面使用靜音行內循環播放，簽名以卡面時間及上述延遲同步，採 `requestVideoFrameCallback` 並以 `timeupdate` 相容處理。頁面隱藏時暫停，離頁時清除同步回呼；載入與播放失敗記錄資產及錯誤，回到可用卡面。選擇保存在當次頁面記憶體，同卡切換語言保留，離開或換卡回到預設。影片沿用遠端素材載入，離線頁面快照保存單卡 JSON 與應用資源。

#### 媒體開關

**CONFIRMED**：`CardDetailScreen` prefab 的 `AutographedSwitchButtonRoot` 為 700×64，右側 `SwitchButton_r32` 為 120×64。標籤寬 580、高 64，與開關間隔 15；白色圓鈕為 48×48，圖案為 28×28。關閉狀態的圓鈕中心 x=32，開啟時移至右側。關閉底色為 `#62628E`、alpha 0.549；外框為白色、alpha 0.251。 底板與外框使用 `CommonRoundBaseAtlas` 的 `ui_999_base_r32_9s`、`ui_999_outline_w3_r32_9s`，圓鈕使用 `ui_999_base_r24_9s`、`ui_999_outline_w4_r24_9s`。

`SwitchButton.SetCharacter()` 透過 `GetDefaultMainMotifIconAddress()` 載入 `img_chr_motif_icon_default_main_{characterAssetId}`，並由 `CharacterColorSetter` 套用角色 `Color4`。圖案沿用 `shared/theme.ts` 的 `getMemberThemeAssets().motifMain`，保留角色素材 ID 前導零。

前端 `CardDetailMediaSwitch` 以既有 PrimeVue `ToggleSwitch` 呈現同比例膠囊、白色圓鈕及角色圖案。兩個媒體選項使用同款開關；標籤保留網站文字色，與開關皆可點選，原生輸入保留鍵盤操作及 switch 語意。開關配色來自卡片角色，動畫偏好遵循減少動態效果設定。

### 詳細頁標題與卡框素材

**CONFIRMED**：APK `UnityDataAssetPack/assets/aa/Android/426dca9772d0aa0e8dc778baf36a8f1e.bundle` 的 `CardDetailScreen` prefab 包含完整標題、卡框與掛飾設定。以 UnityPy、Unity fallback `6000.3.15f1` 讀取各物件 typetree，可由 `GameObject.m_Component`、`RectTransform.m_Father/m_Children` 重建階層；外部 Sprite 由 serialized file 的 `externals` 與 PPtr 的 `m_FileID/m_PathID` 解析。AssetBundle 的 container key 為縮短識別碼，需讀根物件的 `m_Name` 辨識 prefab。

`MainCardRoot` 的繪製順序為 `motif`、`CardTitleGroup`、`card`、`ring`。以下尺寸為 Canvas units；相關 Sprite 的 `m_PixelsToUnits=200`，Canvas reference pixels per unit 為 100，來源 Sprite pixel rect／border 須除以二。

| 元素                | Prefab 設定                                                 |
| ------------------- | ----------------------------------------------------------- |
| `CardTitleGroup`    | 944×164、pivot (0, 0.5)、position (92.96, 33.495)、Z 軸 +1° |
| 標題底板與外框      | 976×164、相對 group 左界 −32                                |
| 卡名／角色名        | 字級 36／48；卡名框 816×49，角色名列高 64                   |
| `card`              | 卡圖 960×540、position (580.99, −325.999)                   |
| 卡框底板與外框      | 1012×594，相對卡圖中心 position (−10, +11)；底板 alpha 0.65 |
| 卡圖遮罩            | `ui_999_base_r36_9s`，圓角 36                               |
| 屬性圖示            | 72×72，卡圖左上 position (−8, +8)                           |
| 星星                | 寬 56、間距 −16，卡圖左下 position (−16, +8)                |
| `ring`／`KeyWiring` | 240×240／214×214；wiring Z 軸 −104°，受 ring mask 裁切      |
| `img_chr_key_chain` | 77.988×166.375、pivot (0.5, 0.73)                           |
| `img_chr_key_motif` | 186.667×186.667、pivot (0.5, 1)，位於 chain 之下            |

**CONFIRMED**：`CardDetailScreenContentListCell_Front/Back` 的 `CharacterColorSetter._individualColorSettingData` 將標題底板指定為 `_colorType=3`，即角色 `Character.Color4`／ButtonColor；外框沒有套用角色色。標題由以下原始圖層組成，依序繪製並以底板 alpha 裁切：

| 圖層     | 原素材與設定                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------- |
| 底板     | `ui_800_img_cardname_base_wh_9s`，角色 Color4                                                            |
| 亮點     | `ui_999_pattern_glitter`，Tiled Image；完整 Texture2D 為 434×434，Canvas tile 為 217×217                 |
| 波紋     | `ui_999_pattern_wave_3_wide_wh`，RawImage alpha 115/255；UV rect (0.33, 0, 5, 1)，Z 軸 −151°、scale Y=−1 |
| 內側光暈 | `ui_999_inwht_b70_a100_9s`，白色 9-slice                                                                 |
| 外框     | `ui_800_img_cardname_outline_9s`，白色 9-slice                                                           |

底板、標題外框、卡框與 `ui_800_img_ring_mask` 位於 [CardAtlas](https://assets.holodori.net/apk/bundle/5c7dca536fc387da111cc16aed58d394.bundle/index.json)；內側光暈與角色標籤位於 [CommonAtlas](https://assets.holodori.net/apk/bundle/e7f629315795970b8fbc94cf21766d2c.bundle/index.json)。[亮點](https://assets.holodori.net/apk/bundle/b2257aa649ca1aa6fb7b75e405610a47.bundle/index.json) 與 [波紋](https://assets.holodori.net/apk/bundle/5a37a2b6fe150ea29663029aa16734c2.bundle/index.json) 使用完整 Texture2D，保留 Sprite 裁切外的透明邊界及 UV 重複範圍。

| Sprite                                     | 解碼尺寸     | Canvas border 左／下／右／上 |
| ------------------------------------------ | ------------ | ---------------------------- |
| `ui_800_img_cardname_{base_wh,outline}_9s` | 141×164      | 87.5／0／53.5／0             |
| `ui_800_img_card_{base_wh,outline}_9s`     | 140×140      | 70／70／70／70               |
| `ui_999_inwht_b70_a100_9s`                 | 142×142      | 70／70／70／70               |
| `ui_999_lab_unit_{base_wh,outline_wh}_9s`  | 32×48／33×48 | 20／0／12.5／0               |

前端以 CSS border image 呈現外框與光暈；卡框以 69px 切片保留 2px 中心取樣區。`CardDetailSpriteMask` 以左右原圖切片及白色中心重建水平 9-slice 的 SVG alpha mask；接合處重疊四個原圖單位，保留素材本身的 alpha 邊緣。標題使用 SVG alpha mask 疊加原圖層，網頁座標反轉後為 −1° 傾斜。字型沿用網站各語系 Noto Sans，字重 800；遊戲 prefab 的日文預設字型為 `TT-RoGSanSrfStdN-Bd SDF_Shadow`，卡名／角色名共用深色 underlay `#24234C`、alpha 166/255。

**CONFIRMED**：詳細頁載入的角色裝飾為 `img_chr_key_wiring_{id}`、`img_chr_key_chain_{id}` 與 `img_chr_motif_main_{id}`，使用卡片 `characterAssetId`、保留前導零。網址為 `https://assets.holodori.net/cdn/{name}/Texture2D/{name}.webp`。掛飾位於卡框及卡圖之後，右側會被遮住；wiring 則位於最上層並使用原 ring mask。`img_chr_key_ring_{id}` 是其他角色鑰匙圈畫面的素材，CardDetail 沒有獨立的 ring texture setter。裝飾缺圖時隱藏，標題文字保留背景。

**CONFIRMED**：角色標籤由 `CharacterGroupingLabelGroup.Set(character)` 與 `CharacterUtility.SetCharacterGroupingLabels` 設定；遊戲取 `SortedRegularCharacterGroupingIds`，先依 `CharacterGrouping.order` 升冪排序，再選取群組 ID；getter 的 `OrderBy` 與 lambda `253_0`／`253_1` 分別確認排序欄位與 ID 投影。白上吹雪的原始群組陣列為 GAMERS、1期生，而兩群組的 order 為 4、2，遊戲顯示為 1期生、GAMERS。每個標籤使用群組本地化名稱與 color1→color2 水平漸層。前端單卡 payload 的 `characterGroups` 依有效 `Character.regularGroupIds` 對應群組的 `CharacterGrouping.order` 升冪提供 id、name、color1、color2，保留原標籤底板及外框。列表 payload 不包含這些欄位。

客戶端 C# 來源為 `Vision.OutGame/Vision/OutGame/CardDetailScreenContentListCellView.cs` 的 `_characterColorSetter`、`_keyWiringImageSetter`、`_keyChainTextureSetter`、`_keyMainMotifTextureSetter`；角色素材地址由 `Vision.Common.Core/Vision/Common/Proto/Master/Character.cs` 的 `AssetNameRelation` 提供。以上路徑相對於 `../extraction/work/decompile/05-annotate-decompiled-code/annotated-csharp/`。

### 詳細頁技能圖示

**CONFIRMED**：技能圖示由彩色底圖、中央效果圖與左下類型字標組成。底圖及字標來自 [技能圖集](https://assets.holodori.net/apk/bundle/5c7dca536fc387da111cc16aed58d394.bundle/index.json)：`ui_800_thm_skill_{sp,active,passive}_base` 及 `ui_800_ico_thm_skill_{sp,active,passive}_txt`。底圖約 120×120；特殊、主動、被動字標分別為 70×53、50×52、45×52。前端以透明圖片疊加，URL 集中於 `shared/game-data/card-icons.ts`。

**CONFIRMED**：中央效果圖沿用 `RemoteAddress.LiveActiveSkillEffect.GetSkillThumb()` 與 `LivePassiveSkillEffect.GetSkillThumb()` 的 enum 名稱轉小寫規則。主動與特殊技能使用 `img_skill_icon_active_{effectName}`，被動使用 `img_skill_icon_passive_{effectName}`；`effectName` 為對應 `LiveActiveSkillEffectType`／`LivePassiveSkillEffectType` 名稱的小寫，不加底線。詳細頁取目前技能等級主要效果群組的第一項效果型別，未知型別或缺圖時保留類型底圖與字標。實際下載確認主動分數提升、特殊分數加成效果提升及被動主動技能效果提升的中央圖案。衣裝縮圖來源見 [服裝資料](costume-live-skills.md#costume)。

### 星級動畫與星形圖示

**CONFIRMED**：`bcb23cb8379398fe524f8a993147f492.bundle` 的來源 Texture2D 尺寸為 1600×1600；Sprite `m_Rect` 確認每格 200×200，依圖集左上至右下排列為 8×8。

[動畫 manifest](https://assets.holodori.net/apk/generated/animations/manifest.json) 的 `frameCount=64`、`rate=60/1`、`loopCount=-1`；`e862167f3e9852ec53f92360e8283a6a.bundle` 的 `SpriteAnimationClip` 引用上述 Sprite，循環長度為 64/60 秒。來源圖集包含 Sprite mesh 外的 texture extrusion；生成動畫依來源 mesh 輪廓裁切，保留透明背景。

**CONFIRMED**：manifest 的 [生成動畫 WebP](https://assets.holodori.net/apk/generated/animations/ef_ui_999_rare_anim_001--da09250dd35035f2.webp) 為 200×200、64 格、1,592,332 bytes，含透明背景。WebP 影格時間以 16／17 ms 表示，總時長 1067 ms，無限循環。

**CONFIRMED**：來源第一格 Sprite 裁切尺寸為 198×189；在 200×200 影格中的位置為 x=1、y=5。

前端動畫 URL 集中於 `shared/game-data/card-icons.ts`。`CardListRarity` 在卡片依星級垂直排列三／四／五顆星星，在稀有度選項依星級橫向顯示三／四／五顆星星及完整文字。每顆星使用單一 `<img>` 顯示完整 200×200 動畫 WebP，播放交由瀏覽器管理。稀有度選項載入時顯示 Skeleton，成功載入後移除；快取圖片於 mount 時確認載入狀態，載入失敗時保留星級文字。

**CONFIRMED**：主要圖示圖集包含以下透明底星形 Sprite，名稱、尺寸及 WebP 路徑由圖集索引確認。

| Sprite 名稱              | 尺寸    | 外觀             | WebP                                                                                                                                                                |
| ------------------------ | ------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui_999_ico_star`        | 111×106 | 白色實心星形     | [圖示](https://assets.holodori.net/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/images/a9a15ec147b71fd3099830685f6f0e0d134b70c3826d7df9399c16a31bb64371.webp) |
| `ui_999_ico_star_rare_s` | 40×40   | 帶外框的白色星形 | [圖示](https://assets.holodori.net/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/images/3efce9fbc4f1f6babf723fd628720386cfc0122bff9b09105a913142a5b71c63.webp) |
| `ui_999_ico_star_rare_l` | 64×62   | 帶外框的白色星形 | [圖示](https://assets.holodori.net/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/images/0abd927ed012c7cfeffcd66eaebf85897bf54be8d46152430ecd00431d105261.webp) |

### 列表 payload

**CONFIRMED**：Nitro 於建置時將 `CardListPayload` 產生為共用靜態 `/data/cards.json`。卡片頁以 client-side `useLazyAsyncData` 先顯示頁首、標題與載入狀態，再取得列表資料；`CardListView` 於資料就緒後初始化網址條件、顯示偏好及技能／Connect 索引。失敗時提供重試，離線同步將此 JSON 與卡片頁保存於同一份快照。

`readCardList()` 重用卡片、角色與成長 converter，回傳 `CardListPayload`，包含 `cards`、依 ID 共用的 `costumes` 與精簡 `skills`。卡片列保留角色順序、角色素材 ID、名稱、卡圖素材、篩選欄位、已計算的滿養成三圍、`costumeId` 及三類卡片技能 ID。`skills` 依技能 ID 保存被引用技能的全部來源等級，並共用條件、效果、Target、模板與標籤；主動效果使用獨立的 `activeEffects` 字典。`characterAssetId` 取自 `Character.assetId`；角色篩選選項以 `img_chr_icon_normal_${characterAssetId}` 素材顯示名稱旁圖示，保留素材 ID 前導零，缺圖時保留名稱。列表資料保存角色順序與六語卡名及角色名；角色排序依 `Character.order`，角色篩選選項依其遞增排列。同順序時角色選項依 ID 遞增，卡片排序則依卡片 `order` 遞減及 ID 遞增排列。角色下拉選單可搜尋所有已設定遊戲語言的名稱，選項與已選標籤仍依目前遊戲語言顯示。六語名稱支援跨語搜尋，成長表保留於生成階段。三圍公式、特化判定與固定案例見 [卡片成長資料](card-growth.md#列表的滿養成三圍)。

`searchTextByCardId` 依卡片 ID 保存建置時產生的完整搜尋文字，來源為六語卡名、角色名、服裝名、全部等級的被動／主動／特殊技能、隊長服裝技能及 Connect 描述。技能沿用既有 `display` composer，已知屬性標記保留可見文字，highlight 標記移除，未解析描述略過。完整文字片段轉為小寫、去重後以換行串接。查詢依空白分詞並要求全部關鍵字符合，可跨欄位及語言比對；空查詢不限。索引獨立於資訊顯示、技能等級選擇及元件載入，列表與技能／Connect 篩選數量共用搜尋結果，離線沿用相同 payload。

`potential_alternative_reward` 與 `acquire_reward` 的結構型別為 `common.Reward`，包含 resource_type、resource_id、quantity；資源種類決定 resource_id 的解讀，schema 未將此欄宣告為單一表的外鍵。獎勵發放條件尚未確認。

篩選區於寬螢幕採三欄：搜尋獨占第一列，第二列依序為稀有度、屬性、特化，第三列依序為角色、技能、Connect；排序位於下方。窄螢幕搜尋仍獨占全寬，其餘控制項依空間縮減欄數並保留順序。

### 技能篩選

技能篩選涵蓋被動、主動、特殊與隊長服裝技能。按鈕開啟 PrimeVue Dialog，內含複選 Tree，並以 PrimeVue Tabs 切換效果與技能類型視角，共用選取集合；父群組支援全選及半選，搜尋後只操作符合搜尋的子項。搜尋框左側提供「全部展開」「全部收合」圖示按鈕，操作目前分類的所有群組。技能條件採 OR，與其他卡片條件採 AND；空選取表示不限。標籤跟隨網站語言，技能摘要跟隨遊戲語言並支援六語搜尋。桌面使用寬版視窗，手機接近滿版；樹清單獨立捲動，分類、搜尋及底部操作保持可用。技能及群組的核取方塊右側、文字前顯示目前可見卡片中具有其技能的卡片數，包含已選技能條件；群組按卡片去重，搜尋時依符合的子項計算。勾選即時套用，底部提供選取數量、可見卡片總數、清除與完成操作；完成或關閉視窗保留選取，重新開啟時清空搜尋，分組及展開狀態保存在頁面記憶體。等價來源與跨等級摘要見[卡片技能](card-skills.md#技能篩選資料)。

效果視角以效果為第一層，其下提供「所有類型」「條件式」「單一加成」「多重加成效果」四類群組，再列出技能；僅顯示非空分支。效果與子群組皆可全選或取消，選取數量依技能去重。條件依各效果對應的 Trigger 判定；單一加成僅含該種類且沒有條件，多重加成效果則含另一效果種類。同一技能可屬於多組，勾選同步。

效果標籤為：表現力提升、技巧提升、品味提升、全能力提升、分數提升、分數加成效果提升、技能發動機率提升、生命值回復與判定強化。判定強化與分數加成效果提升使用統一分類名稱，其餘沿用遊戲用語；分數提升與分數加成效果提升分開分類。「無條件分數加成＋條件式判定強化」會列入兩種效果的所有類型與多重加成效果，另列入判定強化的條件式群組。

網址以單一 `skill=g1.<資料>` 保存最終選取集合：去重、排序後的 `<類型>:<來源技能 ID>` 每行一項，以 UTF-8、gzip、無 padding 的 Base64url 編碼。初次解碼完成後才顯示控制項與列表；後續讀寫僅套用最新操作，切換語言及瀏覽紀錄保留條件。解碼失敗時保留其他有效條件並提示；未知來源 ID 忽略。解壓輸出上限為 256 KiB，完整網址寫入預算為 8,000 bytes；寫入失敗保留當次記憶體選擇與原網址並提示。缺少原生 Compression Streams 時停用技能篩選，其他篩選仍可使用。重設篩選清除技能條件，保留顯示偏好與分組狀態。

### 服裝技能的列表資料來源

**CONFIRMED**：`CardData.rewardCostumeId` 由 `transformCards()` 回傳並保留來源 null；`CharacterData.defaultCostumeId` 由角色 converter 回傳。`transformLiveSkillData()` 提供服裝與技能結構及共用描述 catalog，介面與轉換對照見[服裝技能資料](costume-live-skills.md)。列表的 `costumeId` 優先取卡片獎勵服裝，null 時使用角色預設服裝；共用服裝資料保存六語名稱與技能 ID。來源關聯可由 `.data/master.sqlite` 的 `PRAGMA table_info`、`declared_foreign_keys` 與唯讀 JOIN 重現。

直接讀取獎勵服裝的完整技能描述所用關聯：

| 來源欄位                              | 目標欄位                          | 取得資料                                 |
| ------------------------------------- | --------------------------------- | ---------------------------------------- |
| `Card.reward_costume_id`              | `Costume.id`                      | 卡片附帶的 Live 服裝                     |
| `Costume.live_leader_skill_id`        | `LiveLeaderSkill.id`              | 服裝技能                                 |
| `LiveLeaderSkill.description_lang_id` | `LangGeneratedLiveLeaderSkill.id` | 技能完整描述；以 `language` 選擇遊戲語言 |
| `Costume.name_lang_id`                | `LangCostume.id`                  | 服裝名稱；以 `language` 選擇遊戲語言     |

**CONFIRMED**：2026-10-20 觀察的 master_version 為 `452bd7acfd1b9f90cc85d9978aea55b1a6bf6c2cddaff470c640462830c8c00d`，包含 196 張卡片、204 筆 Costume 與 196 筆 LiveLeaderSkill。54 張四星與 88 張五星的 `reward_costume_id` 皆有值且可連到技能；54 張三星皆為 null。三星可經 `Card.character_id → Character.id`、`Character.default_costume_id → Costume.id` 取得角色預設服裝，再沿相同路徑取得技能。列表依上述優先序選擇服裝，並提供隊長服裝技能顯示。

`Costume.live_leader_skill_id` 可為 null；此快照有 8 件服裝無技能。`LangGeneratedLiveLeaderSkill` 有 1176 筆文字，每個技能皆具備六種設定語言的非 null 描述；`LangLiveLeaderSkill` 為空表。描述保留 `[attribute=...]` 等文字標記。

若需結構化效果與條件，另沿以下關聯讀取：

| 來源欄位                                                        | 目標欄位                                 | 用途                                                     |
| --------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| `LiveLeaderSkill.live_passive_skill_effect_group_id`            | `LivePassiveSkillEffect.group_id`        | 主要效果的 `type`、`value` 與目標 ID                     |
| `LiveLeaderSkill.live_skill_trigger_group_id`                   | `LiveSkillTrigger.group_id`              | 主要發動條件，可為 null                                  |
| `LiveLeaderSkill.additional_live_passive_skill_effect_group_id` | `LivePassiveSkillEffect.group_id`        | 附加效果，可為 null                                      |
| `LiveLeaderSkill.additional_live_skill_trigger_group_id`        | `LiveSkillTrigger.group_id`              | 附加條件，可為 null                                      |
| `LivePassiveSkillEffect.live_skill_effect_target_id`            | `LiveSkillEffectTarget.id`               | [效果目標](live-skill-effect-targets.md)，已有 converter |
| `LivePassiveSkillEffect.description_lang_id`                    | `LangGeneratedLivePassiveSkillEffect.id` | 各效果描述，另以 `language` 選擇語言                     |
| `LiveSkillTrigger.description_lang_id`                          | `LangGeneratedLiveSkillTrigger.id`       | 各條件描述，另以 `language` 選擇語言                     |

效果與條件表的主鍵均為 `(group_id, number)`，應依 `group_id` 取得整組並依 `number` 排序。此快照有 20 筆服裝技能同時包含附加條件與附加效果。

### 服裝技能的描述組合與模板

**CONFIRMED**：上述 2026-10-20 快照中，196 筆 LiveLeaderSkill 的六語完整描述可由對應 Trigger 與 Effect 描述重組；來源完整描述依下表組合主要與附加段落後，1176 個結果皆與 `LangGeneratedLiveLeaderSkill` 相符，僅忽略首尾空白。Effect 的來源描述已包含 Target 文字。

| 語言         | 有條件的單一段落           | 主要與附加段落的分隔 |
| ------------ | -------------------------- | -------------------- |
| `jpn`        | `{trigger}{effect}`        | 換行                 |
| `cht`、`chs` | `{trigger}{effect}`        | 空格                 |
| `eng`、`kor` | `{trigger} {effect}`       | 空格                 |
| `ind`        | `Saat {trigger}, {effect}` | 空格                 |

沒有 Trigger 時，單一段落直接使用 Effect。主要與附加條件分別對應各自效果；目前快照的每組 Trigger 與 Effect 皆只有 `number=1` 一列，多列的文字連接規則為 **UNKNOWN**。

**CONFIRMED**：將實體名稱、屬性標記與數值換成參數後，來源描述具備下列共用句型。`transformLiveSkillData()` 依此歸納模板，六語還原與待確認流程見[服裝技能資料](costume-live-skills.md#描述-catalog-與確認流程)。

| 資料表                   | 來源筆數 | 實際使用的 type                       | 模板參數                                                                 |
| ------------------------ | -------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `LivePassiveSkillEffect` | 192      | 4、5、6、8、10，共 5 種               | `target`、`percent`                                                      |
| `LiveSkillTrigger`       | 215      | 1、2、4、7、8、9、10、11、12，共 9 種 | 依類型使用 `threshold`、`group`、`character`、`attribute`、`judgement`   |
| `LiveSkillEffectTarget`  | 83       | 1、2、4、5，共 4 種                   | 依類型使用 `count`、`group`、`attribute`；群組人數 null 的來源例外見下文 |

192 筆 Effect 的六語描述皆能整理為每個 `(type, language)` 一個模板；目前使用類型的 `percent` 等於來源 `value / 10`，例如 `value="150"` 對應 `15`。215 筆 Trigger 的六語描述亦皆能整理為每個 `(type, language)` 一個模板。群組及角色名稱分別使用 `LangCharacterGrouping` 與 `LangCharacter` 的 `name_lang_id` 對應文字；屬性保留 `[attribute=...]...[/attribute]`，判定標籤保留各語言大小寫。

繁體中文句型範例：

| 類型                                        | 模板                                       |
| ------------------------------------------- | ------------------------------------------ |
| Trigger `DECK_CARD_CHARACTER_GROUPING`（7） | `若編入{threshold}名以上{group}`           |
| Trigger `DECK_CARD_ATTRIBUTE`（8）          | `若編入{threshold}名以上{attribute}的人物` |
| Target `ALL`（2）                           | `全體成員的`                               |
| Target `CHARACTER_GROUPING`（4），人數有值  | `{count}名{group}的`                       |
| Effect `ALL_PARAMETER_UP_PERMIL_UP`（8）    | `{target}全能力提升{percent}%`             |

**CONFIRMED**：`live_skill_effect_target-character_grouping-grp-indonesia` 的 `target_count=null`，六語來源描述皆含 0 人文字；目前沒有 LivePassiveSkillEffect 引用此目標。其生效人數語意為 **UNKNOWN**，來源 null 與數值 0 應保持區分。其餘目標可整理為每個 `(type, language)` 一個模板。此快照的服裝技能僅使用 Target `ALL`、Trigger 類型 7／8，以及上述 5 種 Effect。

### 隊長服裝技能顯示

**CONFIRMED**：`costume` 為單一「隊長服裝技能」資訊選項，控制區塊小標、服裝名稱與完整技能描述。首次使用預設開啟，既有顯示偏好維持原選擇與順序。服裝名稱以較小、較灰的一般字重副標置於小標旁，不加括號。區塊依資訊選取順序呈現，預設位於被動、主動與特殊技能之後。完整卡圖以 row subgrid 對齊同排的名稱、數值與技能，各區塊靠上排列，列高依該排最長內容決定；直式版型使用右側資訊區，所有區塊靠上，依選取順序在同一橫列等寬排列，並保留缺少資料的欄位位置。粗體小標與服裝副標放在靠左的 PrimeVue `Divider` 內，技能描述置於其下方。關閉時移除區塊與間距。

列表只輸出被選服裝與卡片技能全部等級可到達的條件／效果描述、遞迴 Target、模板與標籤。主動技能的機率標籤依來源機率值收集；技能等級保留組合所需的時間與機率等欄位，效果的 type 與描述保留於列表，其餘原始欄位及待確認診斷留在 server；前端以唯讀資料依遊戲語言組合文字。已知屬性標記以 CSS `::before` 背景圖顯示裝飾圖示，前後保留一致間距，文字只出現一次並可直接選取。隱藏圖片沿用 `useImageLoading` 偵測失敗，失敗時移除圖示及間距。無技能與描述待確認分別顯示對應提示，未知標記保留為純文字。

頁面組合條件與效果時，繁簡中文使用 `，`、日文使用 `、`、英文／韓文／印尼文使用逗號加空格；主要與附加技能間，繁簡中文及日文使用 `、`，其餘語言使用分號加空格。組合時整理片段邊界的空白及分隔標點，保留描述內文與文字標記。

完整卡圖共用列數為一列卡圖加上已選資訊項目數，卡名與角色名各自一列，每種技能使用一列；各卡片技能區塊內的已選等級自然排列。關閉選項時移除對應列及間距；個別卡片缺少服裝或已選技能等級時保留其列位置，後續區塊維持對齊。`li`、`article` 與資訊容器使用巢狀 row subgrid；完整卡圖停用 layout containment，直式版型保留 `content-visibility: auto`，資訊列使用 24rem 初始高度估算。純卡圖估算依限制為最大 256px 的卡片寬度計算。

`CardListItem` 立即建立列表項目、可存取卡名與靜態佔位，PrimeVue `DeferredContent` 在位置進入可見範圍後建立完整的 `CardListContent`，並保留至該項目卸載。完整卡圖的 DeferredContent 容器延續 row subgrid。佔位依卡圖比例及所選來源等級數估算高度，載入前不組合技能描述。結果順序、版型、資訊與等級選擇、語言、面板收合、列表寬度、卡片載入及字型就緒後，於 DOM 更新後合併重檢尚未載入的容器；已載入內容保留元件狀態。站內搜尋直接比對完整索引。
