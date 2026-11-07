import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CardListPayload } from '../shared/game-data/cards/list-data.ts'
import { useCardSkillFilterCatalog } from '../app/composables/card/useCardSkillFilterCatalog.ts'
import { buildCardSkillFilterCatalog } from '../shared/game-data/cards/skill-filter.ts'

vi.mock('../shared/game-data/cards/skill-filter.ts', () => ({
  buildCardSkillFilterCatalog: vi.fn(() => ({
    options: [],
    canonicalKeys: {},
    cardSkills: {},
  })),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('useCardSkillFilterCatalog', () => {
  it('reuses the catalog when a list payload is loaded again in the same app', () => {
    const app = {}
    vi.stubGlobal('useNuxtApp', () => app)
    const payload = {} as CardListPayload
    const catalog = useCardSkillFilterCatalog(payload)

    expect(useCardSkillFilterCatalog({ ...payload })).toBe(catalog)
    expect(buildCardSkillFilterCatalog).toHaveBeenCalledExactlyOnceWith(payload)
  })

  it('builds independent catalogs for separate app requests', () => {
    const payload = {} as CardListPayload
    vi.stubGlobal('useNuxtApp', () => ({}))

    expect(useCardSkillFilterCatalog(payload)).not.toBe(
      useCardSkillFilterCatalog(payload),
    )
    expect(buildCardSkillFilterCatalog).toHaveBeenCalledTimes(2)
  })
})
