# Contributing

## Development

Use Node.js 24 or newer with pnpm. Install dependencies and run the development server:

```sh
pnpm install
pnpm dev
```

Fetching the database requires `curl`. Run `pnpm data:fetch` to download it to `.data/master.sqlite`, which is ignored by Git. Running the command again downloads and overwrites the file. If `curl` fails, the command returns a nonzero status and removes any incomplete output.

Convert the downloaded database into website data:

```sh
pnpm data:fetch
pnpm data:transform
```

`data:transform` reads `.data/master.sqlite` in read-only mode and overwrites `public/data/characters.json`, `public/data/cards.json`, `public/data/card-growth.json`, and `public/data/character-groups.json`. These generated files are ignored by Git. Characters contain names, short names, fan names, descriptions, comments, and regular group labels in all configured game languages. Optional character text IDs map to null when absent; when a text ID is present, missing or null translations fail conversion with their source table, field, row ID, language, and text ID. Cards contain names, and character groups contain names and descriptions, in all configured game languages. Characters also include birthday and debut date parts, profile links, numeric enums, costume and asset IDs, source colors, and growth references. Nullable character fields retain null; `isPlayable` maps null to false and `isTutorial` preserves null. Date parts, including zero values, retain their source values. Group membership arrays retain source order; null arrays become empty arrays. Character groups retain all source rows and sort by `order`, then `id`. Growth data retains all source groups, keyed by their IDs. All data is transformed before output files are written. The command reports each module's progress, output path, and counts. Conversion and write errors identify the failing module or output path and retain their underlying cause; the command returns a nonzero status on failure. Fetching and transforming are standalone commands.

Growth levels include cumulative experience thresholds and live deck power values. Level limits include resource consumptions with numeric resource types and quantities. Nullable growth fields retain null; consumption arrays retain their source order. Invalid consumption JSON reports the source field, group ID, and limit break count. Potential effects retain their source values. Potential upgrade items are keyed by card rarity and reference `Item.id` through `itemId`.

See [knowledge/README.md](knowledge/README.md) for the data dictionary, relationships, and field conversion status. Update the relevant knowledge documents when changing data mappings.

### Data transform modules

Each domain owns its SQL, source row types, and field mappings in `scripts/data/transforms/<domain>.ts`, output types in `shared/game-data/<domain>.ts`, and tests in `tests/data/<domain>.test.ts`. Tests create an independent in-memory database with the tables and fixtures needed by that domain.

Modules implement `TransformModule` from `scripts/data/contract.ts`, declaring a JSON filename and returning data with a count summary. Register modules explicitly in `scripts/data/registry.ts`. The CLI owns database lifetime and exit status; `scripts/data/runner.ts` runs all conversions before writing formatted JSON and reporting each output.

Shared helpers live in `scripts/data/common/`. Each domain prepares its own language query and passes the statement and source context to the localization helper. Cross-domain references use source IDs and output types.

When assigning parallel work, keep each domain's transform, types, tests, and data dictionary under one owner. Coordinate changes to the shared contract, helpers, runner, registry, and knowledge index with the integration owner. Data typecheck includes all domain source and test files. Scripts use explicit `.ts` import paths and `import type` for types.

## Checks

Run the checks before submitting changes:

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Build, generate, and typecheck regenerate Nuxt's type definitions after generating styles. Typecheck covers Nuxt, service worker, and data transformation sources. Vue Router is a direct dependency so Nuxt's Volar plugin can be resolved by the project. When validating in a container, use separate generated outputs or mount the repository at the same absolute path used by the host so generated TypeScript configuration resolves plugins consistently.

Vite is a direct development dependency aligned with Nuxt's builder. The pnpm package extension declares Vite for `@nuxt/schema` so configuration types use the same version. Review the dependency and extension when upgrading Nuxt.

Use `pnpm generate` to verify the static site output, manifest, and service worker. The generated language pages include home, cards, characters, and settings for each site and game language combination. PWA behavior is available from HTTPS or localhost. Offline page selections are managed by the custom service worker in `service-worker/sw.ts`; keep its route and payload caching behavior aligned with Nuxt's generated `_payload.json` files.

The character list reads `/api/characters.json`, backed by generated `public/data/characters.json` through Nitro server assets. Run `pnpm data:transform` before generating the site. The data endpoint is prerendered with the pages; missing character data fails generation. Page payloads retain names for offline use; external CDN icons use placeholders when unavailable.

Offline synchronization uses bounded concurrent downloads and aborts stalled transfers. Each selection retains its application scripts, styles, and locale resources. Progress messages keep the worker channel open until completion; test interrupted transfers and preservation of the previous selection when changing this protocol.

`scripts/site-seo.ts` generates `public/sitemap.xml` and `public/robots.txt` during Nuxt configuration. These outputs are ignored by Git. The sitemap derives localized home, cards, and characters routes from the shared language settings. `NUXT_PUBLIC_SITE_URL` must be an HTTP(S) origin and defaults to `https://holodori.net`; set it before generating for another deployment origin.

Static generation fails when a route cannot be prerendered.

Static generation uses up to four prerender workers by default, bounded by available CPUs. Set `NUXT_PRERENDER_WORKERS` to a positive integer to choose the worker count; `1` uses Nitro's native prerenderer. More workers use more memory because each worker has its own runtime. For example:

```sh
NUXT_PRERENDER_WORKERS=2 pnpm generate
```

The adapter uses Nitro's prerender entry. Recheck it when upgrading Nuxt or Nitro, or when adding a server plugin that needs shutdown hooks.

Language identifiers, display names, browser aliases, and Nuxt locale metadata are configured in `shared/language.ts`.

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
