import { describe, expect, it, vi } from 'vitest'
import { resolveCardIconUrls } from '../../scripts/deployment/card-icons.ts'

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
