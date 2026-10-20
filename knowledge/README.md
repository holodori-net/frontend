# 專案知識區

本目錄保存本專案的資料定義、關聯、轉換對照與相關研究。處理相關主題前，先閱讀索引及對應文件；更新知識文件時同步維護索引。開發操作見 [CONTRIBUTING.md](../CONTRIBUTING.md)。

## 文件索引

- [卡片資料](data/cards.md)：Card 與 LangCard 的完整欄位、技能／語音／服裝關聯、服裝技能的列表資料來源、預設服裝關聯、六語描述組合與參數模板、正式屬性與三圍文字及圖示、星級動畫 WebP、來源 sprite 圖集與星形圖示、完整與直式卡圖、列表版型與隊長服裝技能顯示、共用 payload 投影及轉換狀態。
- [角色資料](data/characters.md)：Character 與 LangCharacter 的完整欄位、多語角色資料、生日與出道日期、養成關聯、SD 動畫、群組文字、顏色用途、成員主題投影及轉換狀態。
- [角色群組資料](data/character-groups.md)：CharacterGrouping 與 LangCharacterGrouping 的完整欄位、角色成員關聯、多語文字及轉換狀態。
- [卡片成長資料](data/card-growth.md)：CardLevel、CardLevelLimit、CardPotential 的組別、養成階段、累積經驗門檻、特訓消耗、綻放累加、滿養成三圍公式與特化判定，以及 CardPotentialUpgradeItem 的綻放道具對應與轉換狀態。
- [Live 技能效果目標資料](data/live-skill-effect-targets.md)：LiveSkillEffectTarget 的目標類型、人數、角色／群組／屬性關聯、六語描述與轉換對照。
- [服裝與 Live 服裝技能](data/costume-live-skills.md)：Costume、LiveLeaderSkill、Effect、Trigger 的欄位與關聯、六語共用描述 catalog、模板確認流程、待確認警告及完整描述驗證。

## 來源與適用快照

- Schema：[holodori-net/android-protos](https://github.com/holodori-net/android-protos)，相關 entity.master 與 enums 定義。
- 資料：[holodori-net/android-database](https://github.com/holodori-net/android-database) 的 [master.sqlite](https://github.com/holodori-net/android-database/releases/latest/download/master.sqlite)，本機位於 `.data/master.sqlite`。
- 欄位與關聯的可重現來源：SQLite 的 `PRAGMA table_info`、`logical_fields` 與 `declared_foreign_keys`。
- 轉換依據：[Drizzle schema](../server/data/schema/)、[轉換模組](../server/data/converters/)、[資料型別](../shared/game-data/)。Schema 手動維護查詢所需欄位，透過 `snakeCase.table` 將 camelCase 屬性自動映射為 SQLite 的 snake_case 欄位名稱。Converter 接收 `GameDatabase`，[卡片 reader](../server/data/card-list.ts)、[角色 reader](../server/data/character-list.ts) 與 [主題 reader](../server/data/member-themes.ts) 管理唯讀連線並選取所需欄位，交由 Nuxt 保存為 payload。

卡片文件觀察日期為 2026-10-20，master_version 為 `452bd7acfd1b9f90cc85d9978aea55b1a6bf6c2cddaff470c640462830c8c00d`，此快照包含 196 張卡片與 1176 筆 LangCard。角色文件觀察日期為 2026-10-12，master_version 為 `65badf8533aacbc04382f97f0f5f56740e761e6f5be6172d8440ae9061deebe7`，此快照包含 62 位角色與 2412 筆 LangCharacter。角色群組文件觀察日期為 2026-10-11，master_version 為 `65badf8533aacbc04382f97f0f5f56740e761e6f5be6172d8440ae9061deebe7`，此快照包含 16 個 CharacterGrouping 與 192 筆 LangCharacterGrouping。來源更新後，重新驗證受影響的欄位、枚舉與結論。

卡片成長文件觀察日期為 2026-10-12，master_version 為 `65badf8533aacbc04382f97f0f5f56740e761e6f5be6172d8440ae9061deebe7`，此快照包含 1890 筆 CardLevel、45 筆 CardLevelLimit、15 筆 CardPotential 與 1 筆 CardPotentialUpgradeItem。

Live 技能效果目標文件觀察日期為 2026-10-13，master_version 為 `65badf8533aacbc04382f97f0f5f56740e761e6f5be6172d8440ae9061deebe7`，此快照包含 83 筆 LiveSkillEffectTarget 與 498 筆 LangGeneratedLiveSkillEffectTarget。

卡片文件的服裝技能來源關聯觀察日期為 2026-10-20，master_version 為 `452bd7acfd1b9f90cc85d9978aea55b1a6bf6c2cddaff470c640462830c8c00d`；此快照包含 196 張卡片、204 筆 Costume、196 筆 LiveLeaderSkill 與 1176 筆 LangGeneratedLiveLeaderSkill。

## 信心與轉換狀態

- **CONFIRMED**：可由來源檔案、程式碼或可重現資料直接確認。
- **LIKELY**：有強證據支持，但尚未完整追蹤。
- **HYPOTHESIS**：合理但尚未驗證。
- **UNKNOWN**：尚未確認。

資料字典第一欄為「轉換」：已直接轉換或經查表產生回傳值者標記 `✓`，尚未轉換者留白。回傳對應說明查表或數值轉換方式。用途的信心與轉換狀態分別記錄；未轉換欄位仍列出意義、關聯及原因。
