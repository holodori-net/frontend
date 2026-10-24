# hololive Dreams Unofficial Database

This is an unofficial static Nuxt database for hololive Dreams. It is not affiliated with the hololive Dreams official team. The site interface and game content use separate language settings.

## Language URLs

Pages use `/{site-language}/{game-language}`. For example, `/zh-TW/jpn/cards` displays the card page with a Traditional Chinese interface and Japanese game content. Site languages are `ja`, `en`, and `zh-TW`; game content languages are `jpn`, `eng`, `ind`, `kor`, `cht`, and `chs`.

The home page links to **Cards** and **Characters**. Select the site title in the header to return home.

The pages `/`, `/cards`, `/characters`, and `/settings` select languages from saved manual preferences first, then browser languages, then Japanese defaults. A complete language URL is shown as written. When it differs from a previously selected language, the site asks whether to use the saved preferences or keep the linked languages. Dismissing this prompt by clicking outside keeps the linked languages for the current visit without saving preferences.

Changing either language keeps the current page, query parameters, and fragment.

## Cards

Open **Cards** to browse card art, names, stats, skills, outfits, and Connect effects. Use **Filters and sorting** to find cards and **Card display** to choose the layout, information, and skill levels. Card content follows the game language; labels follow the site language. Stats compare each card at maximum level, special training, and blooming, using only the card's own stats.

The full layout wraps to fit the window, with 16:9 card art and aligned information blocks. The vertical layout places 256:366 art on the left and information in columns on the right; scroll the list horizontally when needed. Both layouts show a horizontal stat addition expression. Specialized stat values use the theme's primary text color.

Search matches card, character, and outfit names, every level of passive, active, special, and leader outfit skills, and Connect descriptions in every game language. Separate keywords with spaces to require all of them, including across different fields or languages. Search covers the full collection, including hidden information and skill levels. For example, `みこ 分數` matches a character name and a skill description.

Combine search with character, rarity, attribute, specialization, skill, and Connect filters. Selections within a filter match any selected value; different filters must all match. Empty character, skill, and Connect selections impose no restriction. Rarity, attribute, and specialization start with all options selected; clearing every option in one of these groups shows no cards. Skill and Connect filter dialogs close when you click outside and retain their current selections. Sort by source order, rarity, character order, Performance, Technique, Sense, or total in either direction. **Reset filters** restores the default filters and sorting while keeping display preferences.

Search, filters, and sorting are saved in the URL and restored when reloading, changing languages, or using browser history. Layout, selected information, and skill levels are saved in this browser and shared across languages, including offline use. **Reset display** restores the default layout and information while keeping search and filters.

The page shows a loading message until it restores display preferences and URL conditions. Cards outside the view show placeholders until you scroll to them, then retain their details. JavaScript is required to browse cards. Card art and icons load from `assets.holodori.net`. Loading card art shows a skeleton placeholder; reduced motion disables its shimmer. Unavailable card art shows a text placeholder while retaining card details; unavailable attribute and stat icons show their names. Stars play as animated WebP images managed by the browser; if star images are unavailable, rarity text appears.

### Card details

Select a card's image or name to open its detail page at `/{site-language}/{game-language}/cards/{card-id}`. On wide screens, full-size art, the leader outfit skill, and Connect appear on the left, with growth controls and special, active, and passive skills on the right. Stats show enlarged, labeled Performance, Technique, and Sense rows with a prominent total alongside. All available card skill and Connect levels remain visible, with the current level emphasized as growth changes.

Use the **Level** slider and **Bloom** dropdown to calculate the card's own stats and skill levels immediately. Special training and its level cap appear beside the selected level and follow the minimum training required for that level. The slider covers the card's full level range. Each Bloom option describes the effects unlocked at that stage. The page starts at maximum growth. Growth choices stay in page memory across language changes; reloading, opening another card, or returning after leaving starts at maximum growth. The return link opens the card list in the current site and game languages.

The default card information is available without JavaScript. Enable JavaScript to use the growth simulator.

## Characters

Open **Characters** to browse members grouped by production. Only playable characters are shown by default; turn on **Show unplayable characters** to include the others. Names follow the selected game content language. The default character list is available without JavaScript. Character icons load from `assets.holodori.net`; unavailable icons show a placeholder while retaining the character's name.

Cards and characters show a loading status while their data downloads. If loading fails, select **Retry** to try again.

## Theme and appearance

Open the display and language menu in the top-right corner to change site language, game content language, appearance, and member theme. Appearance is saved in this browser; **System** follows the device setting.

Member themes use official character colors, avatars, and motifs. Names follow the game content language; search matches names in all game languages. Sakura Miko is the default, and your selection is saved in this browser. Themes remain available offline; unavailable avatars show a member color swatch and unavailable motifs retain the background gradients.

## Install and use offline

The site can be installed from a supported browser when served over HTTPS (or localhost). The close button remembers your choice in this browser until you clear its site data; you can still install from the browser menu. Open **Settings** for a language combination to choose whether its home, cards, and characters pages should be available offline. The current language combination is kept offline; switching to another combination replaces its saved pages after the new selection downloads successfully. The settings page and app resources remain available to manage offline content. Saved card lists support searching, filtering, and sorting offline. Unselected pages, card art, star animations, attribute and stat icons, and character icons require a network connection.

**Card list** and **Card details** are separate offline choices. Selecting **Card details** saves every card detail page for the current language combination, including the data needed for growth calculations. Detail pages can then be opened and reloaded offline. The detail option is initially unselected. Card art and icons use their offline placeholders.

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

Production builds use the GA4 web data stream Measurement ID `G-3Z3154J0WR` by default, so `pnpm generate` needs no extra setting. Set `NUXT_PUBLIC_GA_ID` while generating to override the ID; set it to an empty string to disable Analytics.

In the GA4 web data stream's **Enhanced measurement → Page views** settings, enable **Page changes based on browser history events** to track in-app navigation.

The output is written to `.output/public`. It includes the language entry pages and each configured language combination for all pages, including individual card details, along with the sitemap, robots file, web manifest, and service worker. The sitemap lists the localized public pages and every card detail page. Deploy the contents of that directory to a static host configured to serve generated paths and `404.html` fallback behavior. The service worker and install prompt require HTTPS in production.

Pushes to `main` build and deploy the site to GitHub Pages. You can also run **Deploy to GitHub Pages** manually from GitHub Actions on `main`.
