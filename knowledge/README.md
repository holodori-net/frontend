# 專案知識區

本目錄保存本專案的資料定義、關聯、轉存對照與相關研究。處理相關主題前，先閱讀索引及對應文件；更新知識文件時同步維護索引。開發操作見 [CONTRIBUTING.md](../CONTRIBUTING.md)。

## 文件索引

- [卡片資料](data/cards.md)：Card 與 LangCard 的完整欄位、技能／語音／服裝關聯、欄位用途、素材枚舉與轉存狀態。
- [角色資料](data/characters.md)：Character 與 LangCharacter 的完整欄位、角色名稱與詳細資料關聯、SD 動畫、群組文字、顏色用途及轉存狀態。
- [角色群組資料](data/character-groups.md)：CharacterGrouping 與 LangCharacterGrouping 的完整欄位、角色成員關聯、多語文字及轉存狀態。
- [卡片成長資料](data/card-growth.md)：CardLevel、CardLevelLimit、CardPotential 的組別、養成階段、累積經驗門檻、效果與轉存狀態。

## 來源與適用快照

- Schema：[holodori-net/android-protos](https://github.com/holodori-net/android-protos)，相關 entity.master 與 enums 定義。
- 資料：[holodori-net/android-database](https://github.com/holodori-net/android-database) 的 [master.sqlite](https://github.com/holodori-net/android-database/releases/latest/download/master.sqlite)，本機位於 `.data/master.sqlite`。
- 欄位與關聯的可重現來源：SQLite 的 `PRAGMA table_info`、`logical_fields` 與 `declared_foreign_keys`。
- 轉存依據：[轉換模組](../scripts/data/transforms/)、[執行入口](../scripts/data/cli.ts)、[資料型別](../shared/game-data/)。產物位於 `public/data/`。

卡片與角色文件觀察日期為 2026-10-06，master_version 為 `5267906a638d20ddfc5c68dcb7775b0bda3484dfbb65006cd8e7dc59232112bc`，此快照包含 189 張卡片、62 位角色。角色群組文件觀察日期為 2026-10-11，master_version 為 `65badf8533aacbc04382f97f0f5f56740e761e6f5be6172d8440ae9061deebe7`，此快照包含 16 個 CharacterGrouping 與 192 筆 LangCharacterGrouping。來源更新後，重新驗證受影響的欄位、枚舉與結論。

## 信心與轉存狀態

- **CONFIRMED**：可由來源檔案、程式碼或可重現資料直接確認。
- **LIKELY**：有強證據支持，但尚未完整追蹤。
- **HYPOTHESIS**：合理但尚未驗證。
- **UNKNOWN**：尚未確認。

資料字典第一欄為「轉存」：已直接輸出或經查表產生輸出者標記 `✓`，尚未轉存者留白。輸出對應說明查表或數值轉換方式。用途的信心與轉存狀態分別記錄；未轉存欄位仍列出意義、關聯及原因。
