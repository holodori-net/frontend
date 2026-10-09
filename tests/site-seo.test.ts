import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  escapeXml,
  generateSiteSeo,
  getSiteSeoRoutes,
} from '../scripts/site-seo'
import { gameLocales, siteLocales } from '../shared/language'

const directories: string[] = []
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

describe('site SEO files', () => {
  it('generates sitemap and robots without a catalog directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'holodori-seo-'))
    directories.push(root)

    await generateSiteSeo(root, 'https://example.test')

    const sitemap = await readFile(join(root, 'public/sitemap.xml'), 'utf8')
    const robots = await readFile(join(root, 'public/robots.txt'), 'utf8')
    expect(sitemap.match(/<url>/g)).toHaveLength(
      siteLocales.length * gameLocales.length * 3,
    )
    expect(sitemap).toContain('https://example.test/ja/jpn/')
    expect(sitemap).toContain('https://example.test/zh-TW/cht/cards/')
    expect(sitemap).toContain('https://example.test/zh-TW/cht/characters/')
    expect(sitemap).not.toContain('/settings')
    expect(sitemap).not.toContain('/history')
    expect(sitemap).not.toContain('https://example.test/cards')
    expect(robots).toBe(
      'User-agent: *\nAllow: /\nSitemap: https://example.test/sitemap.xml\n',
    )
  })

  it('derives public page paths from configured locales only', () => {
    const routes = getSiteSeoRoutes()
    expect(routes).toHaveLength(siteLocales.length * gameLocales.length * 3)
    expect(routes).toContain('/en/eng/')
    expect(routes).toContain('/en/eng/cards/')
    expect(routes).toContain('/en/eng/characters/')
    expect(routes).not.toContain('/')
    expect(routes).not.toContain('/cards')
    expect(routes.some((route) => route.includes('/settings'))).toBe(false)
    expect(routes.some((route) => route.includes('/history'))).toBe(false)
  })

  it('escapes XML markup and uses a configurable site origin', async () => {
    expect(escapeXml(`A&B <C> "D" 'E'`)).toBe(
      'A&amp;B &lt;C&gt; &quot;D&quot; &apos;E&apos;',
    )
    const root = await mkdtemp(join(tmpdir(), 'holodori-seo-'))
    directories.push(root)
    await generateSiteSeo(root, 'http://staging.example.test:8080/')
    expect(await readFile(join(root, 'public/sitemap.xml'), 'utf8')).toContain(
      'http://staging.example.test:8080/ja/jpn/',
    )
  })

  it.each([
    'ftp://example.test',
    'not a URL',
    'https://example.test/path',
    'https://user@example.test',
    'https://example.test/?preview=1',
  ])('rejects non-origin site URL %s', async (siteUrl) => {
    const root = await mkdtemp(join(tmpdir(), 'holodori-seo-'))
    directories.push(root)
    await expect(generateSiteSeo(root, siteUrl)).rejects.toThrow(
      'NUXT_PUBLIC_SITE_URL must be an HTTP(S) origin',
    )
  })
})
