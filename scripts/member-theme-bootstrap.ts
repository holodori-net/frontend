import {
  defaultThemeId,
  memberThemeCookieName,
  memberThemeFaviconKey,
  memberThemeFallbackLogoUrl,
  type MemberTheme,
} from '../shared/theme'

export function renderMemberThemeBootstrap(
  themes: readonly MemberTheme[],
): string {
  const validThemeIds = JSON.stringify(themes.map(({ id }) => id)).replace(
    /</g,
    '\\u003c',
  )
  const logosByThemeId = JSON.stringify(
    Object.fromEntries(themes.map(({ id, assets }) => [id, assets.logo])),
  ).replace(/</g, '\\u003c')

  return `(() => {
  const fallback = ${JSON.stringify(defaultThemeId)};
  const name = ${JSON.stringify(memberThemeCookieName)};
  const validIds = ${validThemeIds};
  const logos = ${logosByThemeId};
  const faviconKey = ${JSON.stringify(memberThemeFaviconKey)};
  const fallbackLogo = ${JSON.stringify(memberThemeFallbackLogoUrl)};
  let id = fallback;
  try {
    const cookie = document.cookie.split(';').map(value => value.trim())
      .find(value => value.startsWith(name + '='));
    if (cookie) {
      let saved = decodeURIComponent(cookie.slice(name.length + 1));
      if (saved.startsWith('"')) saved = JSON.parse(saved);
      if (validIds.includes(saved)) id = saved;
    }
  } catch (error) {
    console.warn('Unable to read saved member theme preference', error);
  }
  const favicon = document.querySelector('link[data-hid="' + faviconKey + '"]');
  if (favicon) {
    const source = logos[id] || fallbackLogo;
    favicon.setAttribute('href', source);
    favicon.setAttribute('type', source.endsWith('.webp') ? 'image/webp' : 'image/png');
  }
  document.documentElement.setAttribute('data-theme-id', id);
})();`
}
