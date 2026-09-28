# Contributing

## Development

Use Node.js 22 or newer with pnpm. Install dependencies and run the development server:

```sh
pnpm install
pnpm dev
```

## Checks

Run the checks before submitting changes:

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Use `pnpm generate` to verify the static site output, manifest, and service worker. The generated language pages include home, cards, and settings for each site and game language combination. PWA behavior is available from HTTPS or localhost. Offline page selections are managed by the custom service worker in `service-worker/sw.ts`; keep its route and payload caching behavior aligned with Nuxt's generated `_payload.json` files.

Add language resolution and route behavior tests under `tests/` when changing language handling. Verify offline selection changes preserve the previous cache if any requested page or payload cannot be downloaded.

## Member themes

Theme metadata is registered in `shared/theme.ts`. Keep the stable theme ID separate from member data and map visual roles such as `avatar` and `motifMain` to asset URLs there. Place member assets at stable public paths so theme CSS and views do not depend on source bundle filenames; keep a solid-color background fallback when an optional asset is unavailable. When member import is added, resolve imported assets into these role URLs and replace the local registry asset mapping without changing theme IDs. The Sakura Miko motif uses a CSS mask so light and dark modes can tint the same image independently.
