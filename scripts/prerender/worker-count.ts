import { availableParallelism } from 'node:os'

export function getPrerenderWorkerCount(
  value?: string,
  parallelism = availableParallelism(),
): number {
  if (value === undefined) return Math.max(1, Math.min(4, parallelism))
  if (!/^\d+$/.test(value)) {
    throw new Error('NUXT_PRERENDER_WORKERS must be a positive integer')
  }

  const count = Number(value)
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error('NUXT_PRERENDER_WORKERS must be a positive integer')
  }
  return count
}
