# 卡片資料字典與轉換對照

`transformCards(database)` 回傳 `CardData[]`。角色資料見 [characters.md](characters.md)，成長資料見 [card-growth.md](card-growth.md)。來源與適用快照見 [知識索引](../README.md)。

欄位名稱、SQLite 型別、主鍵、schema 宣告的關聯與轉換對應均為 **CONFIRMED**。用途尚未完整追蹤者另以信心標籤標示；宣告的關聯不等同 SQLite 外鍵約束。`✓` 表示已直接轉換或經查表產生回傳值，空白表示尚未轉換。

## Card

每筆代表一張卡片。角色 ID 指向角色表；名稱依文字 ID 與遊戲語言查找。成長組別指向一組等級或養成階段資料。

**CONFIRMED**：主鍵為 `id`，目前快照 192 筆。

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
|      | `live_passive_skill_id`                 | TEXT                      | 被動技能 ID                                                   | `LivePassiveSkill.id`                                      | —                                          | 未回傳技能、語音、服裝或獎勵資料                                                                |
|      | `live_active_skill_id`                  | TEXT                      | 主動技能 ID                                                   | `LiveActiveSkill.id`                                       | —                                          | 未回傳技能、語音、服裝或獎勵資料                                                                |
|      | `live_special_skill_id`                 | TEXT                      | 特殊技能 ID                                                   | `LiveSpecialSkill.id`                                      | —                                          | 未回傳技能、語音、服裝或獎勵資料                                                                |
| ✓    | `card_potential_group_id`               | TEXT                      | 綻放效果組別                                                  | [`CardPotential.group_id`](card-growth.md#cardpotential)   | `cards[].growth.potentialGroupId`          | —                                                                                               |
| ✓    | `asset_id`                              | TEXT / null               | 卡面素材識別碼                                                | —                                                          | `cards[].assetId`                          | —                                                                                               |
|      | `background_asset_id`                   | TEXT / null               | 背景素材識別欄位；實際用途 **UNKNOWN**                        | —                                                          | —                                          | 用途未確認；目前 192 筆皆為 null                                                                |
|      | `live_skill_character_voice_id`         | TEXT / null               | Live 技能啟動時的候選語音 ID                                  | `CharacterVoice.id`                                        | —                                          | 未回傳語音；用途 **CONFIRMED**，完整抽選機率 **UNKNOWN**                                        |
|      | `skill_tree_connect_effect_id`          | TEXT / null               | 技能樹連結效果 ID                                             | `SkillTreeConnectEffect.id`                                | —                                          | 未回傳技能、語音、服裝或獎勵資料                                                                |
|      | `reward_costume_id`                     | TEXT / null               | 附帶的 Live 服裝獎勵 ID；抽卡精選詳情顯示服裝縮圖             | `Costume.id`                                               | —                                          | 未回傳服裝；顯示用途 **CONFIRMED**，發放條件及首次／重複取得差異 **UNKNOWN**                    |
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

## LangCard

每筆代表一個文字 ID 在一種遊戲語言的卡片名稱。轉換時以 Card.name_lang_id 和 language 查找 text。

**CONFIRMED**：主鍵為 `language, id`，目前快照 1152 筆。

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

### 列表文字與完整卡圖

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

完整卡圖使用 `https://assets.holodori.net/cdn/img_card_full_{assetId}/Texture2D/img_card_full_{assetId}.png`，以 16:9 完整顯示。載入期間顯示 skeleton，偏好減少動態效果時停止其動畫；載入完成後移除，失敗時保留文字及占位。素材用途與 URL 由 `shared/game-data/card-list.ts` 管理。

**CONFIRMED**：`06003-5-uniq-0091-00`、`00034-5-uniq-0090-00` 與 `00001-3-nrml-0000-00` 的完整卡圖均為 2048×1152 PNG，檔案分別為 3,436,240、2,939,695 與 1,871,417 bytes。每張圖的 RGBA8 像素資料為 9 MiB。

### 三圍與屬性圖示

**CONFIRMED**：APK 圖集包含以下 Sprite；三圍為透明底白色字母，屬性使用彩色圓形圖示。尺寸為圖集中裁切後的 PNG 像素大小。

| 用途      | Sprite 名稱                   | 尺寸    | 圖案           |
| --------- | ----------------------------- | ------- | -------------- |
| 表現力    | `ui_999_ico_performance`      | 110×106 | P              |
| 技巧      | `ui_999_ico_technique`        | 110×106 | T              |
| 品味      | `ui_999_ico_sense`            | 101×98  | S              |
| 可愛（1） | `ui_999_ico_element_cute_cl`  | 128×128 | 粉紅心形       |
| 清純（2） | `ui_999_ico_element_pure_cl`  | 128×128 | 綠色葉形       |
| 快樂（3） | `ui_999_ico_element_happy_cl` | 128×128 | 黃橙色旋轉圖案 |

素材來源：[APK 索引](https://assets.holodori.net/apk/index.json) 的 [主要圖示圖集](https://assets.holodori.net/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/index.json)。`files[].objectName` 對應 Sprite 名稱，`files[].path` 相對於該圖集目錄；來源 PNG 位於 `/srv/docker/holodori/public/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/images/`。另有 [陰影圖集](https://assets.holodori.net/apk/bundle/77297a5b58f9376da1f0bb5542e322c2.bundle/index.json)，名稱後綴為 `_shadow`。

客戶端對應：`../extraction/work/decompile/05-annotate-decompiled-code/annotated-csharp/Vision.Common.Core/Vision/Common/AddressDefinition.cs` 的 `LocalSpriteAtlas`；屬性由 `Vision.Common/Vision/Common/CardAttributeTypeIcon.cs` 的 `Set` 選取。屬性 1／2／3 引用的靜態欄位 offset 分別為 8120／8168／8144，對應 `cute_cl`／`pure_cl`／`happy_cl`。觀察日期為 2026-10-14。

前端 URL 對照集中於 `shared/game-data/card-icons.ts`。卡片上的屬性與底部三圍使用圖示；底部依表現力、技巧、品味順序呈現「圖示 數值 + 圖示 數值 + 圖示 數值 = 合計」，窄螢幕與缺圖文字按數值項目換行。篩選與三圍排序選項保留圖示及文字。`CardListIcon` 提供名稱、tooltip、尺寸選擇及載入失敗時的文字 fallback；三圍圖示使用透明背景，亮模式顯示黑色、暗模式顯示白色。

### 星級動畫與星形圖示

**CONFIRMED**：星級動畫素材為 [ef_ui_999_rare_anim_001 圖集](https://assets.holodori.net/cdn/tln_gacha-001/Texture2D/ef_ui_999_rare_anim_001.png)，PNG 尺寸 1600×1600、2,311,747 bytes。`bcb23cb8379398fe524f8a993147f492.bundle` 的 Sprite `m_Rect` 確認每格 200×200，依 PNG 左上至右下排列為 8×8。公開 PNG 與原始 Texture2D 的像素比對一致。

[動畫 manifest](https://assets.holodori.net/apk/generated/animations/manifest.json) 的 `frameCount=64`、`rate=60/1`、`loopCount=-1`；`e862167f3e9852ec53f92360e8283a6a.bundle` 的 `SpriteAnimationClip` 引用上述 Sprite，循環長度為 64/60 秒。原始圖集包含 Sprite mesh 外的 texture extrusion；繪製時依來源 mesh 輪廓裁切，保留透明背景。

**CONFIRMED**：[靜態第一格](https://assets.holodori.net/cdn/tln_gacha-001/Sprite/ef_ui_999_rare_anim_001_0.png) 為 198×189、38,735 bytes，與來源 Sprite 匯出像素一致；在 200×200 影格中的位置為 x=1、y=5。

前端 URL 集中於 `shared/game-data/card-icons.ts`。`CardListRarity` 在卡片依星級垂直排列三／四／五顆星星，在稀有度選項顯示一顆星星及完整文字。靜態 HTML 提供第一格圖片；圖集載入後由 canvas 依來源 Sprite mesh 一次裁切 64 格，建立共用透明 atlas Blob URL。CSS keyframes 只以 transform 播放 64 格動畫。每個星級群組使用一個 IntersectionObserver 訂閱；共享時鐘累積可播放時間，群組進入畫面時同步 CSS 動畫。離開畫面、頁面隱藏或偏好減少動態效果時停止動畫；圖集載入或處理失敗時保留靜態星星，最後一位訂閱者離開時撤銷 atlas URL，靜態圖片也無法載入時保留星級文字。

**CONFIRMED**：主要圖示圖集包含以下透明底星形 Sprite，名稱、尺寸及 PNG 路徑由圖集索引確認，外觀由來源 PNG 確認。

| Sprite 名稱              | 尺寸    | 外觀             | PNG                                                                                                                                                                |
| ------------------------ | ------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ui_999_ico_star`        | 111×106 | 白色實心星形     | [圖示](https://assets.holodori.net/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/images/a9a15ec147b71fd3099830685f6f0e0d134b70c3826d7df9399c16a31bb64371.png) |
| `ui_999_ico_star_rare_s` | 40×40   | 帶外框的白色星形 | [圖示](https://assets.holodori.net/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/images/3efce9fbc4f1f6babf723fd628720386cfc0122bff9b09105a913142a5b71c63.png) |
| `ui_999_ico_star_rare_l` | 64×62   | 帶外框的白色星形 | [圖示](https://assets.holodori.net/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/images/0abd927ed012c7cfeffcd66eaebf85897bf54be8d46152430ecd00431d105261.png) |

### 列表 payload

`readCardList()` 重用卡片、角色與成長 converter，將角色順序、角色素材 ID、名稱、卡圖素材、篩選欄位與已計算的滿養成三圍投影為 `CardListItemData`。`characterAssetId` 取自 `Character.assetId`；角色篩選選項以 `img_chr_icon_normal_${characterAssetId}` 素材顯示名稱旁圖示，保留素材 ID 前導零，缺圖時保留名稱。頁面 payload 保存角色順序與六語卡名及角色名；角色排序依 `Character.order`，角色篩選選項依其遞增排列。同順序時角色選項依 ID 遞增，卡片排序則依卡片 `order` 遞減及 ID 遞增排列。六語名稱支援跨語搜尋，成長表保留於生成階段。三圍公式、特化判定與固定案例見 [卡片成長資料](card-growth.md#列表的滿養成三圍)。

`potential_alternative_reward` 與 `acquire_reward` 的結構型別為 `common.Reward`，包含 resource_type、resource_id、quantity；資源種類決定 resource_id 的解讀，schema 未將此欄宣告為單一表的外鍵。獎勵發放條件尚未確認。
