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
