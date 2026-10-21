# 卡片資料字典與轉換對照

`transformCards(database)` 回傳 `CardData[]`。角色資料見 [characters.md](characters.md)，成長資料見 [card-growth.md](card-growth.md)，卡片技能見 [card-skills.md](card-skills.md)。來源與適用快照見 [知識索引](../README.md)。

欄位名稱、SQLite 型別、主鍵、schema 宣告的關聯與轉換對應均為 **CONFIRMED**。用途尚未完整追蹤者另以信心標籤標示；宣告的關聯不等同 SQLite 外鍵約束。`✓` 表示已直接轉換或經查表產生回傳值，空白表示尚未轉換。

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
|      | `skill_tree_connect_effect_id`          | TEXT / null               | 技能樹連結效果 ID                                             | `SkillTreeConnectEffect.id`                                | —                                          | 未回傳此技能關聯                                                                                |
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

完整卡圖使用 `https://assets.holodori.net/cdn/img_card_full_{assetId}/Texture2D/img_card_full_{assetId}.webp`，以 16:9 完整顯示。直式卡圖使用 `https://assets.holodori.net/cdn/img_card_vert_{assetId}/Texture2D/img_card_vert_{assetId}.webp`，以 256:366 顯示。素材用途與 URL 由 `shared/game-data/card-list.ts` 管理，兩種 URL 均保留素材 ID。

**CONFIRMED**：`06003-5-uniq-0091-00` 來源直式卡圖尺寸為 256×366。預設資訊順序下，直式版型將圖片置左，卡名與角色名置右上，三圍垂直排列並以標籤顯示合計，數值後依序顯示被動、主動、特殊與隊長服裝技能；完整版型維持圖片在上、資訊在下與水平加總算式。兩種版型載入時均顯示 skeleton，偏好減少動態效果時停止其動畫；載入完成後移除，失敗時保留文字及占位。完整卡圖尺寸案例見下方素材記錄。

**CONFIRMED**：列表的「卡片顯示」提供版型及卡名、角色名、三圍與合計、被動技能、主動技能、特殊技能、隊長服裝技能七類資訊選項。資訊選項使用緊湊的小圓角 PrimeVue Button，以 primary 色表示選取、secondary outlined 樣式表示未選，並提供 aria-pressed。各資訊名稱左側以圓形 Badge 顯示排序號，未選時顯示「−」。技能使用 PrimeVue InputGroup 將名稱、排序號與各等級按鈕相連；群組內高度、字級與內距一致，只有外側保留小圓角。所有選項共用同一層排列並依可用寬度整組換行；窄螢幕允許技能名稱折行，等級 chip 維持並排。預設開啟一般資訊，三類卡片技能只選 Lv. 2，各等級可獨立選取；關閉時移除對應內容與間距。全部關閉時只顯示填滿卡片寬度的卡圖、屬性與星級，保留所選版型比例及可存取卡名。資訊項目定義由 `shared/game-data/card-list.ts` 的 `CARD_LIST_FIELDS` 管理；`useCardFields` 以 `holodori-card-fields` 保存 `{ fields, skillLevels }` JSON 物件，`fields` 為依選取先後排列的資訊項目，空陣列表示純卡圖；`skillLevels` 保存各技能已選等級。舊版陣列保留項目與順序，已選技能使用 Lv. 2。技能群組只占一個排序位置，組內等級遞增排列；新增部分等級保留位置，全部清除後再選取移至最後。顯示偏好跨語言共用，搜尋與排序仍使用完整列表資料。「重設顯示」重新套用目前版本的預設版型、資訊項目、技能等級與順序並儲存偏好，保留篩選、網址與面板收合狀態。

**CONFIRMED**：`06003-5-uniq-0091-00`、`00034-5-uniq-0090-00` 與 `00001-3-nrml-0000-00` 的來源完整卡圖尺寸均為 2048×1152。每張圖的 RGBA8 像素資料為 9 MiB。

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

前端 URL 對照集中於 `shared/game-data/card-icons.ts`。卡片上的屬性與三圍使用圖示；完整版型於圖片下方依序呈現「圖示 數值 + 圖示 數值 + 圖示 數值 = 合計」，直式版型於圖片右側垂直呈現三圍與標籤合計，不顯示加號與等號。窄螢幕與缺圖文字按數值項目換行。篩選與三圍排序選項保留圖示及文字。`CardListIcon` 提供名稱、tooltip、尺寸選擇及載入失敗時的文字 fallback；三圍圖示使用透明背景，亮模式顯示黑色、暗模式顯示白色。

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

`readCardList()` 重用卡片、角色與成長 converter，回傳 `CardListPayload`，包含 `cards`、依 ID 共用的 `costumes` 與精簡 `skills`。卡片列保留角色順序、角色素材 ID、名稱、卡圖素材、篩選欄位、已計算的滿養成三圍、`costumeId` 及三類卡片技能 ID。`skills` 依技能 ID 保存被引用技能的全部來源等級，並共用條件、效果、Target、模板與標籤；主動效果使用獨立的 `activeEffects` 字典。`characterAssetId` 取自 `Character.assetId`；角色篩選選項以 `img_chr_icon_normal_${characterAssetId}` 素材顯示名稱旁圖示，保留素材 ID 前導零，缺圖時保留名稱。頁面 payload 保存角色順序與六語卡名及角色名；角色排序依 `Character.order`，角色篩選選項依其遞增排列。同順序時角色選項依 ID 遞增，卡片排序則依卡片 `order` 遞減及 ID 遞增排列。角色下拉選單可搜尋所有已設定遊戲語言的名稱，選項與已選標籤仍依目前遊戲語言顯示。六語名稱支援跨語搜尋，成長表保留於生成階段。三圍公式、特化判定與固定案例見 [卡片成長資料](card-growth.md#列表的滿養成三圍)。

`potential_alternative_reward` 與 `acquire_reward` 的結構型別為 `common.Reward`，包含 resource_type、resource_id、quantity；資源種類決定 resource_id 的解讀，schema 未將此欄宣告為單一表的外鍵。獎勵發放條件尚未確認。

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

**CONFIRMED**：`costume` 為單一「隊長服裝技能」資訊選項，控制區塊小標、服裝名稱與完整技能描述。首次使用預設開啟，既有顯示偏好維持原選擇與順序。服裝名稱以較小、較灰的一般字重副標置於小標旁，不加括號。區塊依資訊選取順序呈現，預設位於被動、主動與特殊技能之後。完整卡圖以 row subgrid 對齊同排的名稱、數值與技能，各區塊靠上排列，列高依該排最長內容決定；直式版型仍使用右側資訊欄，首個數值或技能區塊及其後資訊靠底排列，維持選取順序。粗體小標與服裝副標放在靠左的 PrimeVue `Divider` 內，技能描述置於其下方。關閉時移除區塊與間距。

列表只輸出被選服裝與卡片技能全部等級可到達的條件／效果描述、遞迴 Target、模板與標籤。主動技能的機率標籤依來源機率值收集；技能等級保留組合所需的時間與機率等欄位，效果的原始欄位及待確認診斷留在 server；前端以唯讀資料依遊戲語言組合文字。已知屬性標記以 CSS `::before` 背景圖顯示裝飾圖示，前後保留一致間距，文字只出現一次並可直接選取。隱藏圖片沿用 `useImageLoading` 偵測失敗，失敗時移除圖示及間距。無技能與描述待確認分別顯示對應提示，未知標記保留為純文字。

頁面組合條件與效果時，繁簡中文使用 `，`、日文使用 `、`、英文／韓文／印尼文使用逗號加空格；主要與附加技能間，繁簡中文及日文使用 `、`，其餘語言使用分號加空格。組合時整理片段邊界的空白及分隔標點，保留描述內文與文字標記。

完整卡圖共用列數為一列卡圖加上已選資訊項目數，卡名與角色名各自一列，每種技能使用一列；各卡片技能區塊內的已選等級自然排列。關閉選項時移除對應列及間距；個別卡片缺少服裝或已選技能等級時保留其列位置，後續區塊維持對齊。`li`、`article` 與資訊容器使用巢狀 row subgrid；完整卡圖停用 layout containment，直式版型保留 `content-visibility: auto` 與容器尺寸估算。
