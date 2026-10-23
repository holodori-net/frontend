import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'
import { readCardDetailIndex } from '../../server/data/card-detail.ts'

const sourcePath = new URL('../../.data/master.sqlite', import.meta.url)
const require = createRequire(import.meta.url)
const frameworkRequire = createRequire(require.resolve('nuxt/package.json'))
const handlerPath = new URL(
  '../../server/routes/data/cards/[filename].get.ts',
  import.meta.url,
)

describe.skipIf(!existsSync(sourcePath))('card detail HTTP route', () => {
  it('serves a real card detail through the dynamic JSON route and returns 404 for unknown cards', async () => {
    const h3 = await import(frameworkRequire.resolve('h3'))
    vi.stubGlobal('defineEventHandler', h3.defineEventHandler)
    vi.stubGlobal('createError', h3.createError)
    vi.stubGlobal('getRouterParam', h3.getRouterParam)
    try {
      const route = (await import(handlerPath.href)).default
      const router = h3.createRouter()
      router.get('/data/cards/:filename', route)
      const app = h3.createApp()
      app.use(router)
      const request = h3.toWebHandler(app)
      const id = readCardDetailIndex().cardIds[0]!

      const response = await request(
        new Request(`http://localhost/data/cards/${id}.json`),
      )
      expect(response.status).toBe(200)
      expect((await response.json()).card.id).toBe(id)

      const missing = await request(
        new Request('http://localhost/data/cards/card-missing.json'),
      )
      expect(missing.status).toBe(404)

      const withoutExtension = await request(
        new Request(`http://localhost/data/cards/${id}`),
      )
      expect(withoutExtension.status).toBe(404)
    } finally {
      vi.unstubAllGlobals()
    }
  }, 30_000)
})
