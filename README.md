# Holodori Database

Holodori Database is a static Nuxt site for browsing game reference data. The site interface and game content use separate language settings.

## Language URLs

Pages use `/{site-language}/{game-language}`. For example, `/zh-TW/jpn/cards` displays the card page with a Traditional Chinese interface and Japanese game content. Site languages are `ja`, `en`, and `zh-TW`; game content languages are `jpn`, `eng`, `ind`, `kor`, `cht`, and `chs`.

The root page `/`, `/cards`, and `/characters` select languages from saved manual preferences first, then browser languages, then Japanese defaults. A complete language URL is shown as written. When it differs from a previously selected language, the site asks whether to use the saved preferences or keep the linked languages.

Changing either language keeps the current page, query parameters, and fragment.

## Characters

Open **Characters** to browse members grouped by production. Names follow the selected game content language. Character icons load from `assets.holodori.net`; unavailable icons show a placeholder while retaining the character's name.

## Theme and appearance

Open the display and language menu in the top-right corner to change site language, game content language, appearance, and member theme. Appearance is saved in this browser; **System** follows the device setting.

## Install and use offline

The site can be installed from a supported browser when served over HTTPS (or localhost). Open **Settings** for a language combination to choose whether its home, cards, and characters pages should be available offline. The current language combination is kept offline; switching to another combination replaces its saved pages after the new selection downloads successfully. The settings page and app resources remain available to manage offline content. Unselected pages and character icons require a network connection.

Settings displays download progress. If synchronization fails, the previous offline selection remains available.

The site checks for updates when a page is opened. An update ready during that check activates and reloads the page once. Updates are not applied during in-app navigation.

## Run locally

Install dependencies and prepare game data, then start the development server. Fetching the database requires `curl`:

```sh
pnpm install
pnpm data:fetch
pnpm data:transform
pnpm dev
```

## Build and deploy

Generate the static site after preparing game data:

```sh
pnpm generate
```

Set `NUXT_PUBLIC_SITE_URL` to the deployed HTTP(S) origin before generating; it defaults to `https://holodori.net`.

The output is written to `.output/public`. It includes the language entry pages and each configured language combination for the home, cards, characters, and settings pages, along with the sitemap, robots file, web manifest, and service worker. The sitemap lists the localized home, cards, and characters pages. Deploy the contents of that directory to a static host configured to serve generated paths and `404.html` fallback behavior. The service worker and install prompt require HTTPS in production.
