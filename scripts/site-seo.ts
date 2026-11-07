import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gameLocales, sitePages, siteLocales } from '../shared/language.ts'
import { getCanonicalSeoPath } from '../shared/seo.ts'

export function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function getSiteSeoRoutes(cardIds: readonly string[] = []) {
  const routes = new Set<string>()
  for (const siteLocale of siteLocales) {
    for (const gameLocale of gameLocales) {
      for (const page of sitePages) {
        if (page === 'settings') continue
        routes.add(`${getCanonicalSeoPath({ siteLocale, gameLocale, page })}/`)
      }
      for (const cardId of cardIds) {
        routes.add(
          `${getCanonicalSeoPath({
            siteLocale,
            gameLocale,
            page: 'cards',
            cardId,
          })}/`,
        )
      }
    }
  }
  return [...routes]
}

function parseSiteOrigin(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch (cause) {
    throw new Error('NUXT_PUBLIC_SITE_URL must be an HTTP(S) origin', {
      cause,
    })
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('NUXT_PUBLIC_SITE_URL must be an HTTP(S) origin')
  }
  return url.origin
}

export async function generateSiteSeo(
  root: string,
  siteUrl: string,
  cardIds: readonly string[] = [],
) {
  const origin = parseSiteOrigin(siteUrl)
  const publicRoot = join(root, 'public')
  await mkdir(publicRoot, { recursive: true })
  const entries = getSiteSeoRoutes(cardIds)
    .map(
      (path) =>
        `  <url><loc>${escapeXml(new URL(path, origin).href)}</loc></url>`,
    )
    .join('\n')
  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${entries}\n</urlset>\n`

  await Promise.all([
    writeFile(join(publicRoot, 'sitemap.xml'), sitemap),
    writeFile(
      join(publicRoot, 'robots.txt'),
      `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
    ),
  ])
}
