# 歌曲資料

**CONFIRMED**：`transformSongData()` 由 `Music` 建立完整歌曲 payload；`readSongList()` 在唯讀 SQLite 連線中再轉換角色關聯、列表投影及搜尋索引。來源查詢明確選取所需欄位。可選多語欄位保留每個遊戲語言的 `null`；缺少任一語言列會回報來源表／欄位、Lang 表與列 ID。必要歌曲標題及 MV 分類標籤要求六語非 null 翻譯。

| 轉換 | 輸出           | 來源欄位與轉換                                                                                                                                                                                                                                                                                                                    |
| ---- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓    | 歌曲識別與排序 | `Music.id`, `order` 原樣輸出；`asset_id`、`jacket_asset_id` 保留前導零字串。                                                                                                                                                                                                                                                      |
| ✓    | 標題與文字     | `title_lang_id` → 必要 `title`；`title_ruby_lang_id` → 各語可 null 的 `titleRuby`。subtitle、description、lyricist／ruby、composer／ruby、arranger／ruby、lock description 依各自 Lang ID 選填查詢 `LangMusic`。                                                                                                                  |
| ✓    | 演唱者         | `character_group_display_name_lang_id`／`_ruby_lang_id` 對應 `singerName`／`singerNameRuby`，使用 `LangMusic`。`music_singer_type` 保留 enum 整數；`character_ids` 解析為明確 ID 陣列。                                                                                                                                           |
| ✓    | 時長與發行     | `start_time` 原樣保留文字；此快照值為 Unix epoch 毫秒。`playing_seconds`、`chorus_start_millisecond`、`chorus_end_millisecond`、`category_type`、`release_type`、`required_release_item_quantity`、`live_score_coefficient_permil`、`is_highest_score_rating_target`、`is_tutorial` 原樣保留，nullable 欄位的 null 不轉成預設值。 |
| ✓    | 難度           | `MusicDifficulty` 以 `(music_id, difficulty_type)` 關聯 `MusicDifficultyChart`。輸出 type／level、chart asset、unlock group、full-combo note count 及 max-combo reward threshold；缺少配對譜面即失敗。                                                                                                                            |
| ✓    | 分數與 Combo   | 只讀歌曲引用的 `single_live_score_evaluation_rank_group_id`、`multi_live_score_evaluation_rank_group_id` 及 `live_combo_group_id`。分數依 `(evaluation_rank_type, plus)` 排序，score 數字字串保留原值；Combo 依 `combo_count_from` 排序，score-up permil 原樣保留。引用群組缺列即失敗。                                           |
| ✓    | 解鎖條件       | 僅讀難度與 MV 引用的 `Condition.group_id`；按 number 排序，保留 operator/type/resource/min-max/time 欄位。description／detail description 以 Lang ID 查 `LangCondition`。                                                                                                                                                         |
| ✓    | Music Video    | `MusicMv` 依 music ID、order、number 排列；分類、MV／slide asset、數量、thumbnail、條件與 order 原樣保留。name／description 以 Lang ID 查 `LangMusicMv`。僅輸出被 MV 引用的分類；`MusicMvCategory` 標籤與篩選名由 `LangMusicMvCategory` 查詢，nullable flags 保留 null。                                                          |
| ✓    | 歌曲 MV 與版權 | `Music.mv_url`、`mv_thumbnail_asset_id` 與 `copyright` 原樣對應 `mvUrl`、`mvThumbnailAssetId` 及 `copyright`。                                                                                                                                                                                                                    |
| ✓    | 列表角色       | 只投影歌曲 `character_ids` 明確引用的 Character：id、六語 name、assetId、order。任一引用找不到角色即失敗，不從歌手群組推測成員。                                                                                                                                                                                                  |

來源 enum 整數不轉譯：`Music.category_type` 使用 `MusicCategoryType`（UNKNOWN=0、ORIGINAL=1、COVER=2）；`release_type` 使用 `MusicReleaseType`（UNKNOWN=0、PRESET=1、SHOP=2、REWARD=3）；`music_singer_type` 使用 `MusicSingerType`（UNKNOWN=0、SOLO=1、GROUP=2、ALL=3）。`MusicDifficulty.difficulty_type` 使用 `MusicDifficultyType`（UNKNOWN=0、EASY=1、NORMAL=2、HARD=3、EXPERT=4）；評分 `evaluation_rank_type` 使用 `LiveEvaluationRankType`（UNKNOWN=0、D=1、C=2、B=3、A=4、S=5）。Condition 的 operator、type、min-max 整數分別對應 `ConditionOperatorType`、`ConditionType`、`ConditionMinMaxType`，本資料層保留來源值。

列表投影移除 title／credit／singer ruby、歌曲 assetId 與歌曲級 MV thumbnailAssetId；MV 項目仍保留自己的 thumbnail。`searchTextBySongId` 合併六語標題與 ruby、作詞者／作曲者／編曲者、歌手、角色名、歌曲描述與解鎖說明、MV 名稱／描述、引用 Condition 說明及 MV 分類標籤／篩選名。只索引文字欄位，忽略 null 並以 `toLowerCase()` 小寫化；資源 ID、enum、數值及時間不進索引。

本機快照觀察日期為 2026-10-23，`master_meta.master_version` 為 `452bd7acfd1b9f90cc85d9978aea55b1a6bf6c2cddaff470c640462830c8c00d`，SQLite 檔案 SHA-256 為 `0d03e1d2cf2d80445df40e0a53658f00ebe2fb4ec3e5865c09e8fce214dc098e`。此快照包含 220 筆 Music、13,542 筆 LangMusic、880 組難度／譜面計數、310 筆 MusicMv、3 個 MV 分類、28 筆 LiveScoreEvaluationRank、11 筆 LiveCombo 與 2,855 筆 Condition；歌曲目前未引用 Condition 群組。觀察到 64 筆 arranger 對應列六語皆為 null，`m0352` 的 title ruby 僅日文有文字，其餘語言列保留 null。資料更新後重新檢查欄位、enum、關聯與 null 分布。

## 歌曲分數係數

**CONFIRMED**：`Music.live_score_coefficient_permil` 原樣轉換為 `SongData.scoreCoefficientPermil`。同一份快照於 2026-10-24 核對，220 首歌曲的值皆非 null，範圍為 1–10。`m0020` 為 4、`m0009` 為 5，對應的千分比分別為 0.4% 與 0.5%。

**CONFIRMED**：Android 1.1.1 客戶端的 `LiveScoreCalculator.GetLiveScoreMusicCoefficient` 使用此係數計算譜面難度補正：`1 + live_score_coefficient_permil / 1000 × (difficulty_level - 5)`。`difficulty_level` 為譜面的數字等級。`m0020` 的 EXPERT Lv.27 補正為 1.088（+8.8%）；`m0009` 的 EXPERT Lv.25 為 1.100（+10.0%）。`CalcScore` 將此補正乘入逐音符基礎分數，依序套用 Combo、技能、判定與歌曲技能樹加成，使用 float32 計算並逐音符向上取整。

完整公式、技能疊加、多人補正、原生位址與驗證範圍見工作區共用知識的[逐 Note 得分](../../../knowledge/team-simulator.md#4-逐-note-得分)。

## 曲長加成

**CONFIRMED**：遊戲內「曲長加成」提高活動 Pt 與活動徽章的獲得量。單人結算 `LiveFinishSingleResponse` 與多人結算 `LiveFinishMultiLiveCooperationResult` 的 `music_length_bonus_reward_quantity_up_permil_multiply` 提供千分比倍率；客戶端將大於 1000 的值換算為 `(倍率 - 1000) / 10` 顯示加成百分比，例如 1200 顯示 +20%。

目前 `Music` 僅有 `playing_seconds`，沒有每首歌的曲長獎勵倍率欄位；歌曲 payload 尚未提供這項結算加成。秒數與倍率的對應公式為 **UNKNOWN**。API、提示文字與原生程式碼來源見工作區共用知識的 [Live 結算獎勵](../../../knowledge/live-rewards.md)。

## 遊戲內 MV 與 Live 動畫

**CONFIRMED**：`MusicMv` 以 `(music_id, number)` 為主鍵保存同一首歌的多個影像選項；`music_mv_category_id` 關聯 `MusicMvCategory.id`，名稱與說明由 `name_lang_id`／`description_lang_id` 查 `LangMusicMv`。`Music.mv_url` 保存歌曲層級的單一外部影片連結。

同一份快照於 2026-10-24 核對，〈ねねねねねねねね！大爆走〉的歌曲 ID 為 `m0020`，有以下三筆 `MusicMv`：

| number | 分類 ID                      | 繁中名稱 | mv_asset_id     | slide_mv_asset_id | slide_mv_asset_count |
| ------ | ---------------------------- | -------- | --------------- | ----------------- | -------------------- |
| 1      | `music_mv_category-mv`       | MV       | `m0020-mv-01`   | null              | null                 |
| 2      | `music_mv_category-mv_light` | 圖片輪播 | null            | `m0020-mv-01`     | 20                   |
| 3      | `music_mv_category-live`     | Live動畫 | `m0020-live-01` | null              | null                 |

## 直播靜音素材

**CONFIRMED**：`AssetStreamingMute` 只有一個字串主鍵 `asset_id`，沒有宣告外鍵。同一份快照於 2026-10-24 核對共 74 筆：72 筆為 `music_short_` 前綴的歌曲素材，皆可透過 `'music_short_' || Music.asset_id` 對應歌曲；其餘為 `bgm_chr_profile_00001` 與 `bgm_chr_profile_00013`。72 首歌曲包含 8 首原創與 64 首翻唱。

例如 `music_short_m0022` 對應 `Music.id = m0022`、`asset_id = m0022`，歌名為 `Dream☆Story`。查詢方式：

```sql
SELECT m.id, m.asset_id, a.asset_id AS streaming_mute_asset_id
FROM Music AS m
JOIN AssetStreamingMute AS a
  ON a.asset_id = 'music_short_' || m.asset_id;
```

`transformSongData()` 讀取 `AssetStreamingMute.asset_id`，以 `'music_short_' + Music.asset_id` 的精確清單包含關係產生 `isStreamingMuted`；歌曲列表保留此布林值。

## 歌曲列表介面

列表預設依發行日（`startTime`）數值倒序，日期相同時依來源 order 倒序及 ID 排列。排序可分別選擇 EASY、NORMAL、HARD 或 EXPERT 的樂曲 Lv。六語全文搜尋沿用完整文字索引，角色條件依歌曲的明確 `characterIds` 比對。

封面左上以透明底細框膠囊顯示樂曲類別，文字、邊框與唱片圖示使用遊戲原色，右下顯示曲長。封面下方以四個等寬欄位顯示各難度的樂曲 Lv，各欄採中性底色與隨亮暗主題切換的文字，下緣以 4px 遊戲原色細條標示難度。資訊依序為標題、演唱者、各難度音符數量、解鎖條件及發行日，最下方僅為具備 MV、Live 動畫或直播靜音的歌曲顯示對應中性 Tag，曲長角標亦採中性色；無須解鎖的內容簡示為「無」。歌曲副標題與資訊小標使用卡片頁相同的 Divider。演唱者緊接標題下方並與標題共用一個資訊區塊；同排卡片沿用 CSS row subgrid 共用封面、難度及各啟用資訊區塊的列高，展開成員時同步擴高標題區塊；未啟用的區塊移除，缺少標籤的卡片保留該列位置。演唱者的 hover 提示與點擊展開清單由 `characterIds` 查對應角色的當前遊戲語言名稱，展開清單顯示角色頭像；沒有成員清單時保留來源唱者文字。音符數量依各難度的 `fullComboNoteCount` 分開顯示。

**CONFIRMED**：難度色碼集中於 `shared/game-data/song-difficulty.ts`，取自 APK `data.unity3d` 的 `PaletteStore`（MonoBehaviour path ID 12680）。本機來源為 `../extraction/work/decompile/02-extract-apk/apk-contents/game.qualiarts.hololive.dreams.jp/assets/bin/Data/data.unity3d`；色票的 RGBA float32 以 `round(channel × 255)` 轉成 RGB。遊戲色票用於難度列下緣細條，亮暗模式共用色碼。

| 難度   | 色票名稱   | RGB       |
| ------ | ---------- | --------- |
| EASY   | GameEasy   | `#4FDB95` |
| NORMAL | GameNormal | `#FFBB54` |
| HARD   | GameHard   | `#FD93B6` |
| EXPERT | GameExpert | `#9A93FF` |

**CONFIRMED**：類別色取自同一 `PaletteStore`（`globalgamemanagers.assets`，path ID 12680）的完整原始物件，共 18,776 bytes；色票位於自訂序列化資料，Unity 基底 typetree 不含該區段。`shared/game-data/song-category.ts` 依 `MusicCategoryType` 對應下列色值，類別角標的文字、邊框與 Lucide `Disc3` 圖示使用對應色值，透明底上以陰影維持封面上的辨識度。

| 類別      | 色票名稱        | RGBA float32                         | RGB       |
| --------- | --------------- | ------------------------------------ | --------- |
| 原創（1） | `MusicOriginal` | `(0.6431372762, 0.9019607902, 1, 1)` | `#A4E6FF` |
| 翻唱（2） | `MusicCover`    | `(1, 0.8022267222, 0.4606182277, 1)` | `#FFCD75` |

角色選單沿用卡片頁的頭像選項、多語搜尋與已選角色 Chip；類別、演唱形式、影片及解鎖方式的 Checkbox 沿用卡片頁的 44px 點擊區。角色、類別、演唱形式與直播靜音、影片、解鎖方式於寬螢幕排列為三欄，位於三組範圍控制項上方。直播模式靜音以兩個 Checkbox 選取靜音／不靜音，預設全選；全不選時不顯示任何歌曲。「無須解鎖」選項排在解鎖方式首位。樂曲 Lv、音符數量與曲長範圍各占完整寬度，由 `SongRangeFilter` 共用 Slider 與可編輯端點；樂曲 Lv 與音符數量另有全部／單一難度選擇，任一指定譜面符合即保留歌曲，兩組條件彼此採 AND。輸入與 Slider 共用條件；端點限制於來源範圍且下限不高於上限，清空後恢復對應全域邊界。曲長端點以 `m:ss` 輸入、內部與網址仍保存秒數；可輸入 `m:s` 並正規化秒數為兩位，格式錯誤時恢復目前值。所有端點文字置中，平時透明無框，hover 顯示編輯提示，聚焦顯示輸入框；不另外顯示區間摘要。

影片選項為 `mv`、`live`、`none`，採 OR。`mv` 與 `live` 分別要求 `music_mv_category-mv`／`music_mv_category-live` 及非空 `mv_asset_id`；`none` 表示兩者皆無，只有圖片輪播仍符合。解鎖選項為 `member`、`shop`、`none`、`main`：`release_type=1` 對應無須解鎖，2 對應商店；3 依來源多語解鎖說明辨識成員或主線關卡。未辨識的條件保留為 `other`，未篩選時仍顯示。

網址保存搜尋、角色、類別、演唱形式、兩組譜面範圍、曲長、直播靜音、影片、解鎖與排序，保留其他 query 及 hash。範圍使用 `levelMin/Max`、`notesMin/Max`、`durationMin/Max`；音符難度另以 `notesDifficulty` 保存。直播模式靜音以 `streamingMute=true`／`false` 保存單選，全選省略，空字串代表全不選。複選預設全選，空字串表示全取消，全選省略；舊 `sort=level` 讀為 `levelExpert`。

樂曲頁的「篩選與排序」及「樂曲顯示」面板預設皆收合，手動開合狀態保存在頁面記憶體。`holodori-song-fields` 以 `{ fields }` 保存顯示偏好，預設全開。選項依封面類別、曲長、樂曲Lv、標題、演唱者、音符數量、解鎖、發行日、影片與直播靜音的固定順序排列，不顯示排序編號。樂曲Lv 使用單一開關，同時顯示或隱藏四種難度。讀取舊偏好時忽略 `chartDifficulties`，保留有效欄位；含已取消欄位的舊物件補上音符數與直播靜音。空欄位選取保留純封面模式。重設顯示恢復目前預設，篩選及網址保留。

### 介面用語

**CONFIRMED**：歌曲介面採用 master database 的 `LangClientCommon`、`LangResourceObtainmentRoute` 與 `LangMusicMvCategory` 文字。`cht`、`jpn`、`eng` 分別對應繁體中文、日文與英文。

| 用途          | 來源 key                                                                                              | 繁體中文                   | 日本語                     | English                    |
| ------------- | ----------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------- | -------------------------- |
| 樂曲          | `LangClientCommon.client_id=10435095945216`                                                           | 樂曲                       | 楽曲                       | Songs                      |
| 演唱者        | `LangClientCommon.client_id=179181927588882`                                                          | 演唱者                     | 歌唱者                     | Singer                     |
| 樂曲類別      | `LangClientCommon.client_id=137989107996083`                                                          | 樂曲類別                   | 楽曲カテゴリ               | Song Category              |
| 原創          | `LangClientCommon.client_id=205926950428672`                                                          | 原創                       | オリジナル                 | Original                   |
| 翻唱          | `LangClientCommon.client_id=205993312706560`                                                          | 翻唱                       | カバー                     | Cover                      |
| 難易度        | `LangClientCommon.client_id=806106654334976`                                                          | 難易度                     | 難易度                     | Difficulty                 |
| 樂曲 Lv       | `LangClientCommon.client_id=248908092650803`                                                          | 樂曲Lv                     | 楽曲Lv                     | Song Level                 |
| 難度名稱      | `LangClientCommon.client_id=644284026118144`, `644324887027712`, `644364548366336`, `644391358357504` | EASY、NORMAL、HARD、EXPERT | EASY、NORMAL、HARD、EXPERT | EASY, NORMAL, HARD, EXPERT |
| 發行順        | `LangClientCommon.client_id=231740691275778`                                                          | 依發行日排序               | 配信順                     | Release Order              |
| 曲長          | `LangClientCommon.client_id=184647675026846`                                                          | 曲長加成                   | 曲長ボーナス               | Song Length Bonus          |
| 音符          | `LangClientCommon.client_id=5380235266`                                                               | 音符                       | ノーツ                     | Notes                      |
| 音符數量      | `LangClientCommon.client_id=201583456983557`                                                          | 音符數量詳情               | ノーツ数詳細               | Notes Amount Details       |
| 解鎖條件      | `LangClientCommon.client_id=104872538217778`                                                          | 解鎖條件：                 | 解放条件：                 | Unlock Conditions:         |
| Holo 成員關卡 | `LangResourceObtainmentRoute.id=la-resource_obtainment_route-character_quest`                         | Holo成員關卡               | ホロメンクエスト           | Holomem Quests             |
| 主線關卡      | `LangResourceObtainmentRoute.id=la-resource_obtainment_route-main_quest`                              | 主線關卡                   | メインクエスト             | Main Quest                 |
| 樂曲商店      | `LangResourceObtainmentRoute.id=la-resource_obtainment_route-music_shop`                              | 樂曲商店                   | 楽曲ショップ               | Song Shop                  |
| MV            | `LangMusicMvCategory.id=la-music_mv_category-mv`                                                      | MV                         | MV                         | MV                         |
| Live 影像     | `LangMusicMvCategory.id=la-music_mv_category-live`                                                    | Live動畫                   | ライブ映像                 | Live Video                 |
| MV 篩選       | `LangMusicMvCategory.id=la-music_mv_category-filter-mv`                                               | 有MV                       | MVあり                     | With MV                    |
| Live 影像篩選 | `LangMusicMvCategory.id=la-music_mv_category-filter-live`                                             | 含Live動畫                 | ライブ映像あり             | Live Footage Available     |
| Streamer Mode | `LangClientCommon.client_id=111394954585488`                                                          | 直播設定                   | 配信設定                   | Streamer Mode              |

來源用語維持原文。發行日、曲長與音符數量欄名取自遊戲詞組的詞幹；解鎖條件標籤移除來源文案末尾冒號。樂曲Lv 欄名以「樂曲 Lv.／楽曲 Lv.／Song Level」呈現。MV／Live 影像合併標籤與 Streamer Mode 靜音狀態由網站組合顯示；演唱形式、無須解鎖與輸入提示使用網站介面文案。
