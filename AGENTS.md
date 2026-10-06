# Frontend Repository Context

## 產品與技術基線

- Holodori Database 使用 Nuxt 4、Vue 3、TypeScript、PrimeVue、Tailwind CSS、Nuxt i18n 與自訂 PWA Service Worker。
- Node.js 24+ 與 pnpm 為開發環境；開發及驗證指令見 [CONTRIBUTING.md](CONTRIBUTING.md)，網站操作及部署見 [README.md](README.md)。
- 網站使用檔案路由與靜態生成，部署內容為 `.output/public`。目前提供首頁、cards 空狀態頁及設定頁。
- 語言、主題、頁面清單及素材用途由對應設定管理；數量從設定推導。

## 語言、網址與 SEO

- `shared/language.ts` 集中管理網站語言、遊戲語言、顯示名稱、瀏覽器語言對照與 fallback。Nuxt、選單、路由驗證及 Service Worker 共用此設定。
- 網站語言與遊戲語言獨立；日文 fallback 分別為 `ja` 與 `jpn`，保留遊戲語言的原始代碼。
- 路徑格式為 `/{siteLocale}/{gameLocale}/...`。`/` 與 `/cards` 依已儲存偏好、瀏覽器語言及日文 fallback 選擇語言。
- 完整語言網址先依網址顯示；與已儲存偏好衝突時提供確認。切換語言須保留目前頁面、實體 ID、query 與 hash。
- 新增網站語言需提供介面翻譯；新增遊戲語言需驗證來源文字。語言測試涵蓋設定一致性、實際組合及 fallback。
- Sitemap 收錄已設定語言組合的首頁與 cards 入口；設定頁不列入 sitemap。網站網址由 `NUXT_PUBLIC_SITE_URL` 設定。
- 靜態生成保留明確路由並啟用連結發現；任一路由生成失敗時，建置應失敗。

## 主題與素材

- `shared/theme.ts` 管理主題身分、成員身分及素材用途；選單與頁面使用 registry。
- 保留主題 ID `15-sakura-miko` 的已儲存偏好相容性。匯入其他來源時，以明確對照連結既有 memberId 與來源角色 ID。
- 目前素材用途為 `avatar` 與 `motifMain`；新增用途集中定義，選用素材缺失時提供 fallback。
- 主題背景須維持亮暗模式可讀、低對比且不遮擋內容。樣式生成流程與 PrimeVue 元件相依設定見 CONTRIBUTING。

## PWA 與離線

- 進站檢查時套用已就緒的更新，最多自動 reload 一次；站內導覽途中不強制更新。
- 離線選擇保存目前語言組合的首頁與 cards 頁面；設定頁及必要的 scripts、styles、語言資源一併保存。
- 完整下載成功後才替換已儲存的選擇；失敗時保留原本可用的頁面與資源。
- Service Worker 共用語言驗證，依序處理同步請求；下載使用有限併發及停滯逾時。
- 通訊協定須區分進度與完成訊息；持續收到進度時更新等待期限，傳送 Vue 狀態前先建立可複製的資料。
- 設定頁的自動同步、連線狀態及語言切換須與 PWA client plugin 一致。

## 驗證與維護

- 本專案知識文件保存在 `knowledge/`，以 [knowledge/README.md](knowledge/README.md) 作為索引。處理相關主題前，先閱讀索引及對應文件。
- 研究或實作改變資料定義、關聯、轉換行為或既有結論時，同步更新相關知識文件；新增、改名或移除文件時，同步更新索引。

- 共用行為變更須涵蓋語言切換、直連、生成 HTML、sitemap，以及離線中斷與失敗保留舊內容。
- 調整離線更新時，驗證頁面與其應用資源在版本切換後仍可使用。
- 平行 prerender 使用 Nitro entry；升級 Nuxt／Nitro 或新增需關閉處理的 server plugin 時，重新驗證 adapter。
- 文件與程式保持一致；正式產物只描述目前行為及維護所需資訊。
