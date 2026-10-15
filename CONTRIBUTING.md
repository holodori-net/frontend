# Contributing

## Development

Use Node.js 24 or newer with pnpm and `curl`. Run commands from the repository root. Generate and preview the static site:

```sh
pnpm install
pnpm data:fetch
pnpm generate
pnpm preview
```

Fetching the database requires `curl`. Run `pnpm data:fetch` to download it to `.data/master.sqlite`, which is ignored by Git. Running the command again downloads and overwrites the file. If `curl` fails, the command returns a nonzero status and removes any incomplete output.

The card and character pages and member theme plugin read SQLite during prerendering and store their data in Nuxt payloads. Their readers open `.data/master.sqlite` in read-only mode, convert the source data, select the required fields, and close the database. Each reader reports the source path and loaded count; read and conversion failures retain their underlying cause and stop generation. Style generation also requires the database.

See [knowledge/README.md](knowledge/README.md) for the data dictionary, relationships, and field conversion status. Update the relevant knowledge documents when changing data mappings.

### Game data layer

The data layer uses `drizzle-orm` with the built-in `node:sqlite` driver and synchronous query methods. The RC version is pinned in `pnpm-lock.yaml`.

Each domain owns its Drizzle queries and field mappings in `server/data/converters/<domain>.ts`, schema in `server/data/schema/<domain>.ts`, return types in `shared/game-data/<domain>.ts`, and tests in `tests/data/<domain>.test.ts`. Tests create an independent in-memory SQLite database and pass it through `createGameDatabase`.

Maintain schema definitions by hand for the tables and columns used by queries. Verify SQLite types, nullability, and primary keys with `PRAGMA table_info` before extending a schema. Use `snakeCase.table` from `drizzle-orm/sqlite-core` with camelCase properties and unnamed column builders, such as `characterId: text()`, to map columns to snake_case automatically. Specify a column name only when it differs from that convention. Queries select their fields explicitly; JSON keys and source names in error messages retain the database spelling.

`server/data/database.ts` provides `createGameDatabase(client: DatabaseSync)` and the inferred `GameDatabase` type. Converters accept a `GameDatabase` and return complete domain data. Readers open read-only connections, wrap them with `createGameDatabase`, select the fields needed by their consumers, and close the SQLite client in `finally`. The readers live in `server/data/card-list.ts`, `server/data/character-list.ts`, and `server/data/member-themes.ts`. Data modules use ordinary functions with explicit imports; pages and the theme plugin connect their readers to Nuxt through their server branches.

Shared helpers live in `server/data/common/`. Each domain reuses a parameterized Drizzle prepared query for language lookups and passes `{ language, text }` rows, the text ID, and source context to the localization helper. Missing or null translations report their language and source field. Cross-domain references use source IDs and return types.

When assigning parallel work, keep each domain's transform, types, tests, and data dictionary under one owner. Coordinate changes to shared helpers, readers, and the knowledge index with the integration owner. Data typecheck includes all domain source and test files. Data modules use explicit `.ts` relative import paths and `import type` for types. Runtime imports from the shared directory use `#shared`; Nuxt and Vitest resolve the alias, and `package.json` maps it through Node's `imports` field for build scripts.

## Checks

Run the checks before submitting changes:

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm generate
```

Build, generate, and typecheck regenerate Nuxt's type definitions after generating styles. Typecheck covers Nuxt, service worker, and data transformation sources. Vue Router is a direct dependency so Nuxt's Volar plugin can be resolved by the project. When validating in a container, use separate generated outputs or mount the repository at the same absolute path used by the host so generated TypeScript configuration resolves plugins consistently.

Vite is a direct development dependency aligned with Nuxt's builder. The pnpm package extension declares Vite for `@nuxt/schema` so configuration types use the same version. Review the dependency and extension when upgrading Nuxt.

Use `pnpm generate` to verify the static site output, manifest, and service worker. The generated language pages include home, cards, characters, and settings for each site and game language combination. PWA behavior is available from HTTPS or localhost. Offline page selections are managed by the custom service worker in `service-worker/sw.ts`; keep its route and payload caching behavior aligned with Nuxt's generated `_payload.json` files.

The character page uses `useAsyncData('character-list', ...)` and dynamically imports its reader in the server branch. Its payload contains `id`, `name`, `productionId`, `assetId`, `isPlayable`, `order`, and `color1` for all characters, including names in every configured game language. Hydration and static navigation reuse the generated payload. Missing page data is an error; external CDN icons show circular Skeletons while loading and placeholders when unavailable. Verify the generated pages with a static server, including navigation from another page and offline use.

The card page uses `useAsyncData('card-list', ...)` with the same payload flow. Its reader combines the complete card, character, and growth converters, then selects `CardListItemData`: IDs, character order and asset ID, localized card and character names, rarity, attribute, card asset ID, card source order, maximum level, final stats, total, and specializations. Character sorting follows `Character.order`; card order and ID resolve ties. Growth tables remain on the server. `server/data/card-list-stats.ts` calculates each stat with float32 operations and upward rounding; see [card growth](knowledge/data/card-growth.md) for the formula and reference cases. Missing character or growth references stop generation.

`shared/game-data/card-list.ts` handles search, filters, sorting, layout, and query serialization. Card conditions use `q`, repeated `character`, `rarity`, `attribute`, and `specialization` parameters, plus `sort`, `direction`, and `layout` (`full` or `vertical`). Default values are omitted, invalid values are ignored, and unrelated query parameters and fragments are preserved. Search filters immediately and replaces the URL after 250 ms; filter, sort, layout, and reset actions push history entries. Reset restores filters and sorting while keeping the selected layout. Static HTML uses the default list, then applies URL conditions after hydration. Verify browser history, both language switches, responsive wrapping, both appearances, offline filtering, and image placeholders on the generated site.

The card grid uses `repeat(auto-fill, minmax(min(100%, 350px), 1fr))`. Cards have a 350 px minimum column width and fit the container on narrower screens. Each card list item uses `display: block`; the list suppresses markers while retaining list semantics. Full layout uses a 16:9 art area and a horizontal stat expression. Vertical layout places the source 256:366 art at the left and names at the top right and vertically listed stats with a labeled total aligned to the bottom right. A PrimeVue Skeleton fills the image area while loading; successful loads remove it, while unavailable art shows a wrapping text placeholder. Cached images reconcile their state on mount and source changes, and reduced motion disables the skeleton shimmer. Attribute and vertical rarity stars overlay the image. The stat footer shows the three stats and total, retaining icon fallbacks and wrapping in narrow columns. Specialized stat numbers use the primary text color. Offscreen card articles use `content-visibility: auto` with a width-derived intrinsic block-size estimate based on the selected image ratio and rendered height. Verify scrolling, long-name wrapping, narrow screens, and unavailable icons on generated browser pages.

`shared/game-data/card-icons.ts` maps attributes and stats to the APK Sprite PNG URLs; `shared/game-data/character-list.ts` maps character asset IDs to normal icon URLs while preserving leading zeros. `CardListIcon` provides translated image labels, sizes for card overlays and inline stats, and a text fallback when loading fails. Dropdown options and selected sort values enable Skeletons through the `loadingSkeleton` prop. Images render above their Skeletons as soon as the browser loads them. Monochrome stat icons use transparent backgrounds and CSS filters to appear black in light mode and white in dark mode; small icons use 1rem images. Card attributes and footer stats use icons; character filter options show normal icons beside their names, and filter and stat sort options retain text beside their icons. Verify successful image loads, failed loads, language switching, and offline text fallbacks.

The same registry defines the remote star sprite sheet and static frame URLs. `CardListRarity` shows three, four, or five stars vertically on cards, or three, four, or five stars horizontally beside the full rarity label in filter options. The card stack fits the space below the attribute icon on narrower cards. Static images appear in generated HTML while the shared sprite sheet loads. Rarity filter options enable `loadingSkeleton`; each Skeleton disappears when its static image or animation is ready. After the sheet loads, a canvas clips its 64 frames once using the source Sprite meshes and creates one transparent atlas URL shared by visible stars. The sprite CDN must allow anonymous CORS requests from the page origin for atlas processing. Generated CSS moves the atlas with transform keyframes at 60 fps. One observer tracks each rarity group; a shared elapsed clock synchronizes CSS animations when groups enter view. Playback pauses outside the viewport or when the page is hidden; reduced motion or a failed sheet keeps the static image, and unavailable images show translated text. The final subscriber releases the shared atlas URL. Verify loading, synchronized playback, scrolling, filter choices, motion preference changes, and offline fallback on the generated site.

Offline synchronization uses bounded concurrent downloads and aborts stalled transfers. Each selection retains its application scripts, styles, and locale resources. Progress messages keep the worker channel open until completion; test interrupted transfers and preservation of the previous selection when changing this protocol.

`scripts/site-seo.ts` generates `public/sitemap.xml` and `public/robots.txt` during Nuxt configuration. These outputs are ignored by Git. The sitemap derives localized home, cards, and characters routes from the shared language settings. `NUXT_PUBLIC_SITE_URL` must be an HTTP(S) origin and defaults to `https://holodori.net`; set it before generating for another deployment origin.

Static generation fails when a route cannot be prerendered.

Static generation uses up to four prerender workers by default, bounded by available CPUs. Set `NUXT_PRERENDER_WORKERS` to a positive integer to choose the worker count; `1` uses Nitro's native prerenderer. More workers use more memory because each worker has its own runtime. For example:

```sh
NUXT_PRERENDER_WORKERS=2 pnpm generate
```

The adapter uses Nitro's prerender entry. Recheck it when upgrading Nuxt or Nitro, or when adding a server plugin that needs shutdown hooks.

Language identifiers, display names, browser aliases, and Nuxt locale metadata are configured in `shared/language.ts`.

HTML language tags are `ja`, `en`, `id`, `ko`, `zh-Hant-TW`, and `zh-Hans-CN` for both interface and game text. Names carry the language actually selected after falling back to Japanese and then English. Mark game names and language names explicitly, including PrimeVue overlay options and selected chips; interface labels and placeholders inherit the site language. Game content uses the `.game-text` class with `text-autospace: normal`. Route, cookie, and data locale identifiers retain their existing values.

The shared Google Fonts CSS2 stylesheet requests Noto Sans, Noto Sans JP, TC, SC, and KR at weights 400, 500, 600, and 700 with `display=swap`. Language selectors in `app/assets/css/main.css` use Noto Sans for Latin characters before the matching CJK family; Chinese selectors use `:lang(zh-Hant)` and `:lang(zh-Hans)`. Keep Google's Unicode subsets so browsers download only the required font files.

`service-worker/sw.ts` uses Workbox's `googleFontsCache` recipe: stale-while-revalidate for the stylesheet and cache-first for font files, with cache prefix `holodori-google-fonts`, at most 256 font files, and a one-year maximum age. Keep `workbox-recipes` and `workbox-precaching` versions aligned. Font requests populate this cache during browsing; offline page synchronization downloads only its own pages and application resources. Verify mixed interface/content languages, overlays, chips, narrow-screen wrapping, and cached and unavailable fonts offline when changing these settings.

Localized pages live under `app/pages/[gameLocale]/`. Nuxt's `pages:extend` hook derives matching language entry routes from those pages and uses `app/components/LanguageEntry.vue` for each entry. Add a localized page in that directory to create its unprefixed entry automatically; keep prerender entry routes derived from the same scanned route list.

Add language resolution and route behavior tests under `tests/` when changing language handling. Verify offline selection changes preserve the previous cache if any requested page or payload cannot be downloaded.

## Member themes

The build generates shared CSS from `app/themes/primevue.ts` and the component list in `shared/primevue.ts`. Register used PrimeVue components in that list and include their nested component and directive styles in `primeVueStyleDependencies`. Verify this mapping when adding components or upgrading PrimeVue. The generated stylesheet is bundled by Nuxt and cached with application assets for offline use.

The generator imports `@primevue/core` and `@primevue/metadata` as direct development dependencies. Keep their versions aligned with `primevue` and `@primevue/nuxt-module` when upgrading.

`pnpm dev`, `pnpm build`, `pnpm generate`, and `pnpm typecheck` generate styles before starting Nuxt. To refresh styles after editing the preset, component list, member palette, or theme asset mapping during development, run:

```sh
pnpm styles:generate
```

The command reads member themes directly from SQLite and writes `app/assets/css/generated.css`, which is ignored by Git. Missing component styles, invalid source colors, or a missing default member stop generation with an error. PrimeVue uses the generated theme CSS; member theme changes update `data-theme-id` and appearance changes update the root `dark` class.

`server/data/member-themes.ts` reuses the character converter and projects `MemberTheme[]`: `id`, six-language `name`, `order`, `color1` through `color4`, and avatar and motif URLs. IDs are `Character.id`; the default is Sakura Miko (`chr-00015`). Members without a main color are excluded; optional colors fall back to the main color. Playability does not affect inclusion. Themes follow source order, then ID. Source color strings are normalized to `#RRGGBB`.

`app/themes/member-palettes.ts` derives every palette through the same PrimeVue color utilities. `color1` supplies the page, surface, and header tones, `color2/3` supply low-contrast gradients and home decorations, and `color4` supplies interaction colors, header brand text, and the display settings icon. Both appearances retain at least 4.5:1 contrast for main text and button labels, including hover and active states. The default supplies CSS variables for an absent or unknown theme ID. The PWA manifest derives its default colors through the same reader and palette function.

`app/plugins/member-theme.ts` initializes `useAsyncData('member-themes', ...)` through its server branch; hydration and static navigation use Nuxt payloads. `useMemberTheme` reads that data with `useNuxtData` and shares selection through `useState`. Generated HTML uses Miko, then the mounted browser applies `holodori-theme-id`; absent or invalid IDs select the default. Subsequent selections save the cookie. Names follow the game language and the menu searches all six languages.

`shared/theme.ts` defines `avatar` and `motifMain` asset roles. CDN names are `img_chr_icon_normal_${assetId}` and `img_chr_motif_icon_default_main_${assetId}`, retaining leading zeros. The motif uses a repeating CSS mask tinted by the theme; failed motif loads retain gradients and the page background. Avatars show circular Skeletons while loading and the member's main color on failure. Character portraits, avatars, and card icons reconcile cached images on mount and source changes; reduced motion disables their Skeleton shimmer, including rarity stars. Generated styles and payloads use existing application and offline page caches. Verify preference restoration, theme switching and reloads, language navigation, direct links, narrow screens, slow and failed image loads, and offline switching on the generated site.

Remote motif masks require the CDN to allow the page's origin through CORS. The CDN allows `https://holodori.net` and `https://www.holodori.net`; local preview origins without CORS permission show the gradient fallback. Verify CDN CORS permissions when deploying to another origin.
