# Frontend Repository Context

## 產品與技術基線

- Holodori Database 使用 Nuxt 4、Vue 3、TypeScript、PrimeVue、Tailwind CSS、Nuxt i18n 與自訂 PWA Service Worker。
- Node.js 24+ 與 pnpm 為開發環境；開發及驗證指令見 [CONTRIBUTING.md](CONTRIBUTING.md)，網站操作及部署見 [README.md](README.md)。
- 網站使用檔案路由與靜態生成，部署內容為 `.output/public`。目前提供首頁、卡片列表、角色列表及設定頁。
- 語言、主題、頁面清單及素材用途由對應設定管理；數量從設定推導。

## 語言、網址與 SEO

- `shared/language.ts` 集中管理網站語言、遊戲語言、顯示名稱、瀏覽器語言對照與 fallback。Nuxt、選單、路由驗證及 Service Worker 共用此設定。
- 網站語言與遊戲語言獨立；日文 fallback 分別為 `ja` 與 `jpn`，保留遊戲語言的原始代碼。
- 路徑格式為 `/{siteLocale}/{gameLocale}/...`。`/`、`/cards`、`/characters` 與 `/settings` 依已儲存偏好、瀏覽器語言及日文 fallback 選擇語言。
- 完整語言網址先依網址顯示；與已儲存偏好衝突時提供確認。切換語言須保留目前頁面、實體 ID、query 與 hash。
- 新增網站語言需提供介面翻譯；新增遊戲語言需驗證來源文字。語言測試涵蓋設定一致性、實際組合及 fallback。
- Sitemap 收錄已設定語言組合的首頁、cards 與 characters 入口；設定頁不列入 sitemap。網站網址由 `NUXT_PUBLIC_SITE_URL` 設定。
- 靜態生成保留明確路由並啟用連結發現；任一路由生成失敗時，建置應失敗。

## 主題與素材

- 主題 ID 使用 `Character.id`，預設為みこ `chr-00015`。
- `shared/theme.ts` 定義主題型別、預設及 `avatar`／`motifMain`／`motifLight` 素材用途；素材網址保留 `assetId` 前導零，缺圖時保留成員色票或漸層底色。
- `app/plugins/member-theme.ts` 以 `useAsyncData('member-themes', ...)` 保存 Nuxt payload，初始化偏好並更新 `data-theme-id`；composable 以 `useNuxtData` 與 `useState` 共用資料及選擇。靜態 HTML 使用みこ，hydration 後套用 cookie；無效 ID 使用預設。
- 主題四色來自角色資料，缺少選填色時使用主色；`color1` 衍生頁面、surface 與 topbar 底色、`color2/3` 裝飾與色票、`color4` 互動色、topbar 品牌文字與顯示設定圖示。共用規則生成亮暗色階，主要文字及按鈕文字須維持 4.5:1 對比。
- CSS 與 PWA manifest 直接使用同一 reader；主題資料沿用 Nuxt payload。選單名稱跟隨遊戲語言並支援六語搜尋；離線切換保留配色並提供遠端素材 fallback。
- 角色列表的 production 分區與 `icon` 素材用途集中在 `shared/game-data/character-list.ts`；圖示缺失時保留角色名稱與占位。
- 遊戲資料層位於 `server/data/`，共用資料型別位於 `shared/game-data/`。卡片與角色頁於 prerender 時直接唯讀讀取 `.data/master.sqlite`；converter 回傳完整資料，reader 選取列表欄位交由 Nuxt 保存為頁面 payload。生成失敗時須保留來源錯誤。
- 卡片列表採滿等、滿特訓、滿綻放的自身三圍，以 float32 逐項計算並向上取整；特化依來源權重最高項判定。搜尋、複選篩選與排序保存於 query；`full`／`vertical` 版型由獨立 composable 保存於 `localStorage` 的 `holodori-card-layout`，預設 `full` 並跨語言共用。版型選擇器位於標題右側、篩選區右上方，切換時保留網址、瀏覽紀錄及篩選；Reset 重設篩選與排序並保留版型。舊 query 的 `layout` 忽略，下次寫入篩選網址時移除。靜態 HTML 與首次 hydration 保留頁首、標題及可存取的中性 loading，讀取偏好並套用網址條件後一次顯示控制項與列表，不等待圖片；停用 JavaScript 時顯示提示。偏好缺失、無效或讀取失敗使用 `full`；讀寫例外記錄警告，寫入失敗保留當次記憶體選擇。
- 卡片屬性與三圍圖示的 APK 素材網址集中於 `shared/game-data/card-icons.ts`；卡片與選單共用 `CardListIcon`，三圍圖示使用透明背景，亮模式顯示黑色、暗模式顯示白色，圖示載入失敗時保留文字名稱。
- 卡片與稀有度選項共用 `CardListRarity`，每顆星以單一 `<img>` 播放 APK 生成的透明動畫 WebP，播放交由瀏覽器管理。稀有度選項載入時顯示 Skeleton，快取圖片於 mount 時確認載入狀態；圖片載入失敗時顯示星級文字。
- 卡片網格以 350px 最小欄寬自動換行，較窄螢幕縮至容器寬度。完整卡圖版型以 16:9 卡圖呈現並使用水平三圍加總算式；直式版型以 256:366 卡圖置左，卡名與角色名置右上，垂直三圍及標籤合計靠右側底部，不顯示加號與等號。屬性與垂直星星列位於卡圖左側。合計以一般文字色及粗體呈現，特化數值使用主題文字色；窄螢幕與缺圖文字按數值項目換行，須保持亮暗主題可讀及 fallback 不溢出。
- 主題背景須維持亮暗模式可讀、低對比且不遮擋內容。樣式生成流程與 PrimeVue 元件相依設定見 CONTRIBUTING。

## PWA 與離線

- 進站檢查時套用已就緒的更新，最多自動 reload 一次；站內導覽途中不強制更新。
- 離線選擇可保存目前語言組合的首頁、cards 與 characters 頁面；設定頁及必要的 scripts、styles、語言資源一併保存。卡圖與角色圖示由 CDN 載入，離線時提供占位；卡片資料可離線搜尋、篩選與排序。
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
