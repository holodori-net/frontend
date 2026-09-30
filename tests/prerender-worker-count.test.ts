import { describe, expect, it } from 'vitest'
import { getPrerenderWorkerCount } from '../scripts/prerender/worker-count.ts'

describe('prerender worker count', () => {
  it('uses at most four workers and respects available CPU count', () => {
    expect(getPrerenderWorkerCount(undefined, 16)).toBe(4)
    expect(getPrerenderWorkerCount(undefined, 2)).toBe(2)
    expect(getPrerenderWorkerCount(undefined, 1)).toBe(1)
  })

  it('accepts explicit positive integers', () => {
    expect(getPrerenderWorkerCount('1', 16)).toBe(1)
    expect(getPrerenderWorkerCount('6', 2)).toBe(6)
  })

  it.each(['', ' ', '0', '1.5', 'NaN', '-1', 'Infinity', '9007199254740992'])(
    'rejects invalid values: %s',
    (value) => {
      expect(() => getPrerenderWorkerCount(value, 8)).toThrow(
        'NUXT_PRERENDER_WORKERS must be a positive integer',
      )
    },
  )
})
