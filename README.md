# Holodori Database

Holodori Database is a static Nuxt site for browsing game reference data. The site interface and game content use separate language settings.

## Language URLs

Pages use `/{site-language}/{game-language}`. For example, `/zh-TW/jpn/cards` displays the card page with a Traditional Chinese interface and Japanese game content. Site languages are `ja`, `en`, and `zh-TW`; game content languages are `jpn`, `eng`, `ind`, `kor`, `cht`, and `chs`.

The pages `/`, `/cards`, `/characters`, and `/settings` select languages from saved manual preferences first, then browser languages, then Japanese defaults. A complete language URL is shown as written. When it differs from a previously selected language, the site asks whether to use the saved preferences or keep the linked languages.

Changing either language keeps the current page, query parameters, and fragment.

## Cards

Open **Cards** to browse full or vertical card art, names, rarity, attribute, and stats. Choose the layout beside sorting. Card and character names follow the game content language; labels follow the site language. Rarity uses a vertical stack of animated stars matching the star count. Attributes and specializations use game icons with translated names in tooltips. Specialization icons indicate the card's highest source weight. Stats compare each card at maximum level, special training, and blooming, using only the card's own stats.

The gallery wraps to fit the window. Full card art uses a 16:9 image and a horizontal stat addition expression. Vertical card art uses its 256:366 ratio on the left, with names at the top right and vertically listed stats plus a labeled total at the bottom right. Specialized stat values use the theme's primary text color.

Search matches card and character names in every game language. Combine character, rarity, attribute, and specialization filters; multiple selections within a filter match any selected value. Character filter options follow character order. Rarity, attribute, and specialization choices show their icons alongside names. Sort by source order, rarity, character order, Performance, Technique, Sense, or total in either direction; stat choices also show their icons. All matching cards are displayed together. **Reset** restores the default filters and descending source order.

Search, filters, sorting, and layout are saved in the URL and restored when reloading, changing languages, or using browser history. Reset keeps the selected layout. Card art and icons load from `assets.holodori.net`. Loading card art shows a skeleton placeholder; reduced motion disables its shimmer. Unavailable card art shows a text placeholder while retaining card details; unavailable attribute and stat icons show their names. Stars appear as static images while their animation loads or reduced motion is enabled. Animations play while visible; if star images are unavailable, rarity text appears.

## Characters

Open **Characters** to browse members grouped by production. Only playable characters are shown by default; turn on **Show unplayable characters** to include the others. Names follow the selected game content language. Character icons load from `assets.holodori.net`; unavailable icons show a placeholder while retaining the character's name.

## Theme and appearance

Open the display and language menu in the top-right corner to change site language, game content language, appearance, and member theme. Appearance is saved in this browser; **System** follows the device setting.

Member themes use official character colors, avatars, and motifs. Names follow the game content language; search matches names in all game languages. Sakura Miko is the default, and your selection is saved in this browser. Themes remain available offline; unavailable avatars show a member color swatch and unavailable motifs retain the background gradients.

## Install and use offline

The site can be installed from a supported browser when served over HTTPS (or localhost). The close button remembers your choice in this browser until you clear its site data; you can still install from the browser menu. Open **Settings** for a language combination to choose whether its home, cards, and characters pages should be available offline. The current language combination is kept offline; switching to another combination replaces its saved pages after the new selection downloads successfully. The settings page and app resources remain available to manage offline content. Saved card lists support searching, filtering, and sorting offline. Unselected pages, card art, star animations, attribute and stat icons, and character icons require a network connection.

Settings displays download progress. If synchronization fails, the previous offline selection remains available.

Text uses Noto Sans from Google Fonts. After the service worker controls the page, fonts used while browsing are cached independently of offline page downloads. Cached fonts remain available offline; font files that are unavailable, expired, or removed from the cache use system fonts.

The site checks for updates when a page is opened. An update ready during that check activates and reloads the page once. Updates are not applied during in-app navigation.

## Run locally

Use Node.js 24 or newer with pnpm and `curl`. From the repository root, download the game database, generate the static site, and preview it:

```sh
pnpm install
pnpm data:fetch
pnpm generate
pnpm preview
```

## Build and deploy

Generate the static site from the downloaded `.data/master.sqlite`:

```sh
pnpm generate
```

Set `NUXT_PUBLIC_SITE_URL` to the deployed HTTP(S) origin before generating; it defaults to `https://holodori.net`.

The output is written to `.output/public`. It includes the language entry pages at `/`, `/cards`, `/characters`, and `/settings`, each configured language combination for the home, cards, characters, and settings pages, along with the sitemap, robots file, web manifest, and service worker. The sitemap lists the localized home, cards, and characters pages. Deploy the contents of that directory to a static host configured to serve generated paths and `404.html` fallback behavior. The service worker and install prompt require HTTPS in production.
