# 專案知識區

本目錄保存本專案的資料定義、關聯、轉換對照與相關研究。處理相關主題前，先閱讀索引及對應文件；更新知識文件時同步維護索引。開發操作見 [CONTRIBUTING.md](../CONTRIBUTING.md)。

## 文件索引

- [卡片資料](data/cards.md)：Card 與 LangCard 的完整欄位、技能／語音／服裝關聯、欄位用途、素材枚舉與轉換狀態。
- [角色資料](data/characters.md)：Character 與 LangCharacter 的完整欄位、多語角色資料、生日與出道日期、養成關聯、SD 動畫、群組文字、顏色用途及轉換狀態。
- [角色群組資料](data/character-groups.md)：CharacterGrouping 與 LangCharacterGrouping 的完整欄位、角色成員關聯、多語文字及轉換狀態。
- [卡片成長資料](data/card-growth.md)：CardLevel、CardLevelLimit、CardPotential 的組別、養成階段、累積經驗門檻、特訓消耗、效果，以及 CardPotentialUpgradeItem 的綻放道具對應與轉換狀態。
- [Live 技能效果目標資料](data/live-skill-effect-targets.md)：LiveSkillEffectTarget 的目標類型、人數、角色／群組／屬性關聯、六語描述與轉換對照。

## 來源與適用快照

- Schema：[holodori-net/android-protos](https://github.com/holodori-net/android-protos)，相關 entity.master 與 enums 定義。
- 資料：[holodori-net/android-database](https://github.com/holodori-net/android-database) 的 [master.sqlite](https://github.com/holodori-net/android-database/releases/latest/download/master.sqlite)，本機位於 `.data/master.sqlite`。
- 欄位與關聯的可重現來源：SQLite 的 `PRAGMA table_info`、`logical_fields` 與 `declared_foreign_keys`。
- 轉換依據：[轉換模組](../server/data/converters/)、[資料型別](../shared/game-data/)。角色頁由 [reader](../server/data/character-list.ts) 選取列表欄位，交由 Nuxt 保存為頁面 payload。

卡片文件觀察日期為 2026-10-06，master_version 為 `5267906a638d20ddfc5c68dcb7775b0bda3484dfbb65006cd8e7dc59232112bc`，此快照包含 189 張卡片。角色文件觀察日期為 2026-10-12，master_version 為 `65badf8533aacbc04382f97f0f5f56740e761e6f5be6172d8440ae9061deebe7`，此快照包含 62 位角色與 2412 筆 LangCharacter。角色群組文件觀察日期為 2026-10-11，master_version 為 `65badf8533aacbc04382f97f0f5f56740e761e6f5be6172d8440ae9061deebe7`，此快照包含 16 個 CharacterGrouping 與 192 筆 LangCharacterGrouping。來源更新後，重新驗證受影響的欄位、枚舉與結論。

卡片成長文件觀察日期為 2026-10-12，master_version 為 `65badf8533aacbc04382f97f0f5f56740e761e6f5be6172d8440ae9061deebe7`，此快照包含 1890 筆 CardLevel、45 筆 CardLevelLimit、15 筆 CardPotential 與 1 筆 CardPotentialUpgradeItem。

Live 技能效果目標文件觀察日期為 2026-10-13，master_version 為 `65badf8533aacbc04382f97f0f5f56740e761e6f5be6172d8440ae9061deebe7`，此快照包含 83 筆 LiveSkillEffectTarget 與 498 筆 LangGeneratedLiveSkillEffectTarget。

## 信心與轉換狀態

- **CONFIRMED**：可由來源檔案、程式碼或可重現資料直接確認。
- **LIKELY**：有強證據支持，但尚未完整追蹤。
- **HYPOTHESIS**：合理但尚未驗證。
- **UNKNOWN**：尚未確認。

資料字典第一欄為「轉換」：已直接轉換或經查表產生回傳值者標記 `✓`，尚未轉換者留白。回傳對應說明查表或數值轉換方式。用途的信心與轉換狀態分別記錄；未轉換欄位仍列出意義、關聯及原因。
