import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prepareCardIcons } from '../../scripts/assets/card-icons.ts'
import {
  getCardAttributeIconUrl,
  getCardStatIconUrl,
} from '../../shared/game-data/cards/assets.ts'

const publicUrls = [
  getCardStatIconUrl('performance'),
  getCardStatIconUrl('technique'),
  getCardStatIconUrl('sense'),
  ...[1, 2, 3].map((attribute) => getCardAttributeIconUrl(attribute)!),
]
const webp = Uint8Array.from(
  Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64'),
)

function fixtures() {
  const files = publicUrls.map((url, i) => ({
    bytes: webp.length,
    objectName: basename(url, '.webp'),
    objectType: 'Sprite',
    path: `images/new-export-${i}.webp`,
    role: 'trimmed',
  }))
  const requests: URL[] = []
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input))
    requests.push(url)
    if (url.pathname.endsWith('/index.json')) return Response.json({ files })
    if (files.some(({ path }) => url.pathname.endsWith(`/${path}`))) {
      return new Response(webp)
    }
    return new Response(null, { status: 404 })
  }
  return { files, fetcher, requests }
}

let directory: string
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'card-icons-'))
})
afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

describe('prepareCardIcons', () => {
  it('uses fresh indexed export paths and writes all six same-site URLs', async () => {
    const { fetcher, requests } = fixtures()
    await prepareCardIcons(directory, fetcher)
    expect(getCardAttributeIconUrl(0)).toBeNull()
    expect(publicUrls.every((url) => url.startsWith('/card-icons/'))).toBe(true)
    expect(await readdir(directory)).toEqual(
      publicUrls.map((url) => basename(url)).sort(),
    )
    for (const url of publicUrls) {
      expect(await readFile(join(directory, basename(url)))).toEqual(
        Buffer.from(webp),
      )
    }
    expect(requests).toHaveLength(7)
    expect(
      requests.every((url) => url.searchParams.has('frontend-build')),
    ).toBe(true)
    expect(requests.slice(1).map(({ pathname }) => basename(pathname))).toEqual(
      Array.from({ length: 6 }, (_, i) => `new-export-${i}.webp`),
    )
  })

  it('rejects missing, ambiguous, or out-of-atlas sprite paths', async () => {
    for (const mode of ['missing', 'duplicate', 'unsafe']) {
      const { files, fetcher, requests } = fixtures()
      if (mode === 'missing') files.shift()
      if (mode === 'duplicate') files.push({ ...files[0]! })
      if (mode === 'unsafe') files[0]!.path = 'images/../outside.webp'
      await expect(prepareCardIcons(directory, fetcher)).rejects.toThrow(
        'Invalid or missing card icon index entry: ui_999_ico_performance',
      )
      expect(requests).toHaveLength(1)
    }
  })

  it('keeps existing output when an indexed export returns 404 or invalid bytes', async () => {
    const output = join(directory, basename(publicUrls[0]!))
    await writeFile(output, 'existing')
    const { fetcher } = fixtures()
    for (const [response, error] of [
      [new Response(null, { status: 404 }), 'HTTP 404'],
      [new Response(new Uint8Array(webp.length)), 'Invalid WebP'],
    ] as const) {
      await expect(
        prepareCardIcons(directory, async (input) =>
          String(input).includes('new-export-5') ? response : fetcher(input),
        ),
      ).rejects.toThrow(error)
      expect(await readFile(output, 'utf8')).toBe('existing')
      expect(await readdir(directory)).toEqual([basename(output)])
    }
  })
})
