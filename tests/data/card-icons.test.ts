import { existsSync } from 'node:fs'
import process from 'node:process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  readCardIconUrls,
  resolveCardIconUrls,
} from '../../server/data/card-icons.ts'

const names = [
  'ui_999_ico_performance',
  'ui_999_ico_technique',
  'ui_999_ico_sense',
  'ui_999_ico_element_cute_cl',
  'ui_999_ico_element_pure_cl',
  'ui_999_ico_element_happy_cl',
]
function fixtures() {
  return names.map((objectName, i) => ({
    objectName,
    objectType: 'Sprite',
    role: 'trimmed',
    path: `images/new-export-${i}.webp`,
  }))
}

describe('resolveCardIconUrls', () => {
  it('reads the index once and returns the current CDN URLs', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ files: fixtures() }),
    )
    const urls = await resolveCardIconUrls(fetcher)
    const indexUrl = new URL(String(fetcher.mock.calls[0]?.[0]))
    expect(indexUrl.pathname).toMatch(/\/index\.json$/)
    expect(indexUrl.searchParams.has('frontend-build')).toBe(true)
    expect(fetcher).toHaveBeenCalledTimes(1)
    const base = new URL('./images/', indexUrl).href
    expect(urls).toEqual({
      stats: {
        performance: `${base}new-export-0.webp`,
        technique: `${base}new-export-1.webp`,
        sense: `${base}new-export-2.webp`,
      },
      attributes: {
        1: `${base}new-export-3.webp`,
        2: `${base}new-export-4.webp`,
        3: `${base}new-export-5.webp`,
      },
    })
  })

  it.each(['missing', 'duplicate', 'unsafe'])(
    'rejects a %s Sprite entry',
    async (mode) => {
      const files = fixtures()
      if (mode === 'missing') files.shift()
      if (mode === 'duplicate') files.push({ ...files[0]! })
      if (mode === 'unsafe') files[0]!.path = 'images/../outside.webp'
      await expect(
        resolveCardIconUrls(async () => Response.json({ files })),
      ).rejects.toThrow(
        'Invalid or missing card icon index entry: ui_999_ico_performance',
      )
    },
  )

  it('reports an unavailable index', async () => {
    await expect(
      resolveCardIconUrls(async () => new Response(null, { status: 404 })),
    ).rejects.toThrow('Card icon index: HTTP 404')
  })
})

const sourcePath = new URL('../../.data/master.sqlite', import.meta.url)

describe('readCardIconUrls', () => {
  afterEach(() => {
    Reflect.deleteProperty(process, Symbol.for('holodori.cardIconUrls'))
  })

  it('retries a failed lookup and shares a successful lookup across module copies', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ files: fixtures() }))
    vi.stubGlobal('fetch', fetcher)
    try {
      await expect(readCardIconUrls()).rejects.toThrow(
        'Card icon index: HTTP 503',
      )
      const request = readCardIconUrls()
      vi.resetModules()
      const fresh = await import('../../server/data/card-icons.ts')
      expect(fresh.readCardIconUrls()).toBe(request)
      const urls = await request
      expect(await readCardIconUrls()).toBe(urls)
      expect(fetcher).toHaveBeenCalledTimes(2)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it.skipIf(!existsSync(sourcePath))(
    'includes the same URLs once in the list and detail payloads',
    async () => {
      const fetcher = vi.fn<typeof fetch>(async () =>
        Response.json({ files: fixtures() }),
      )
      vi.stubGlobal('fetch', fetcher)
      try {
        const { readCardListPayload } =
          await import('../../server/data/card-list.ts')
        const { readCardDetailPayload, readCardDetailIndex } =
          await import('../../server/data/card-detail.ts')
        const id = readCardDetailIndex().cardIds[0]!
        const [list, detail] = await Promise.all([
          readCardListPayload(),
          readCardDetailPayload(id),
        ])
        expect(detail?.iconUrls).toBe(list.iconUrls)
        expect(Object.keys(list.iconUrls.attributes)).toHaveLength(3)
        expect(list.cards[0]).not.toHaveProperty('iconUrls')
        expect(detail?.card).not.toHaveProperty('iconUrls')
        expect(fetcher).toHaveBeenCalledOnce()
      } finally {
        vi.unstubAllGlobals()
      }
    },
  )
})
