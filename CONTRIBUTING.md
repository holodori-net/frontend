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

The character page reads SQLite during prerendering and stores its list data in Nuxt's page payload. The reader opens `.data/master.sqlite` in read-only mode, converts characters, selects the list fields, and closes the database. It reports the source path and character count; read and conversion failures retain their underlying cause and stop generation.

See [knowledge/README.md](knowledge/README.md) for the data dictionary, relationships, and field conversion status. Update the relevant knowledge documents when changing data mappings.

### Game data layer

Each domain owns its SQL, source row types, and field mappings in `server/data/converters/<domain>.ts`, return types in `shared/game-data/<domain>.ts`, and tests in `tests/data/<domain>.test.ts`. Tests create an independent in-memory database with the tables and fixtures needed by that domain.

Converters accept a `DatabaseSync` and return complete domain data. Page readers own database lifetime and explicitly select the fields needed by their pages. The character reader lives in `server/data/character-list.ts`. Data modules use ordinary functions with explicit imports; the page connects the reader to Nuxt through its server branch.

Shared helpers live in `server/data/common/`. Each domain prepares its own language query and passes the statement and source context to the localization helper. Cross-domain references use source IDs and return types.

When assigning parallel work, keep each domain's transform, types, tests, and data dictionary under one owner. Coordinate changes to shared helpers, page readers, and the knowledge index with the integration owner. Data typecheck includes all domain source and test files. Data modules use explicit `.ts` import paths and `import type` for types. Runtime imports from the shared directory use Nuxt's `#shared` alias, which Vitest also resolves.

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

The character page uses `useAsyncData('character-list', ...)` and dynamically imports its reader in the server branch. Its payload contains `id`, `name`, `productionId`, `assetId`, `isPlayable`, `order`, and `color1` for all characters, including names in every configured game language. Hydration and static navigation reuse the generated payload. Missing page data is an error; external CDN icons use placeholders when unavailable. Verify the generated pages with a static server, including navigation from another page and offline use.

Offline synchronization uses bounded concurrent downloads and aborts stalled transfers. Each selection retains its application scripts, styles, and locale resources. Progress messages keep the worker channel open until completion; test interrupted transfers and preservation of the previous selection when changing this protocol.

`scripts/site-seo.ts` generates `public/sitemap.xml` and `public/robots.txt` during Nuxt configuration. These outputs are ignored by Git. The sitemap derives localized home, cards, and characters routes from the shared language settings. `NUXT_PUBLIC_SITE_URL` must be an HTTP(S) origin and defaults to `https://holodori.net`; set it before generating for another deployment origin.

Static generation fails when a route cannot be prerendered.

Static generation uses up to four prerender workers by default, bounded by available CPUs. Set `NUXT_PRERENDER_WORKERS` to a positive integer to choose the worker count; `1` uses Nitro's native prerenderer. More workers use more memory because each worker has its own runtime. For example:

```sh
NUXT_PRERENDER_WORKERS=2 pnpm generate
```

The adapter uses Nitro's prerender entry. Recheck it when upgrading Nuxt or Nitro, or when adding a server plugin that needs shutdown hooks.

Language identifiers, display names, browser aliases, and Nuxt locale metadata are configured in `shared/language.ts`.

Localized pages live under `app/pages/[gameLocale]/`. Nuxt's `pages:extend` hook derives matching language entry routes from those pages and uses `app/components/LanguageEntry.vue` for each entry. Add a localized page in that directory to create its unprefixed entry automatically; keep prerender entry routes derived from the same scanned route list.

Add language resolution and route behavior tests under `tests/` when changing language handling. Verify offline selection changes preserve the previous cache if any requested page or payload cannot be downloaded.

## Member themes

The build generates shared CSS from `app/themes/primevue.ts` and the component list in `shared/primevue.ts`. Register used PrimeVue components in that list and include their nested component and directive styles in `primeVueStyleDependencies`. Verify this mapping when adding components or upgrading PrimeVue. The generated stylesheet is bundled by Nuxt and cached with application assets for offline use.

The generator imports `@primevue/core` and `@primevue/metadata` as direct development dependencies. Keep their versions aligned with `primevue` and `@primevue/nuxt-module` when upgrading.

`pnpm dev`, `pnpm build`, `pnpm generate`, and `pnpm typecheck` generate styles before starting Nuxt. To refresh styles after editing the preset, component list, member palette, or theme asset mapping during development, run:

```sh
pnpm styles:generate
```

The command writes `app/assets/css/generated.css`, which is ignored by Git. Missing component styles or member palettes stop generation with an error. PrimeVue uses the generated theme CSS; member theme changes update `data-theme-id` and appearance changes update the root `dark` class.

Member palettes are defined in `app/themes/member-palettes.ts`, keyed by the stable theme ID. Each palette provides the primary scale, light and dark surface and semantic colors, page and motif colors, and motif size and gap. Keep palette data in this build input; the browser uses the generated CSS variables. Each registered theme needs a palette. The default theme supplies fallback CSS variables for an absent or unknown theme ID.

Theme metadata is registered in `shared/theme.ts`. Keep the stable theme ID separate from member data and map visual roles such as `avatar` and `motifMain` to asset URLs there. Place member assets at stable public paths so theme CSS and views do not depend on source bundle filenames; keep a solid-color background fallback when an optional asset is unavailable. When member import is added, resolve imported assets into these role URLs and replace the local registry asset mapping without changing theme IDs. The Sakura Miko motif uses a CSS mask so light and dark modes can tint the same image independently.
