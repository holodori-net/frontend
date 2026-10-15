import { describe, expect, it } from 'vitest'
import { renderCardRarityCss } from '../scripts/styles/card-rarity.ts'
import {
  cardRarityAnimationDuration,
  cardRarityAnimationName,
  cardRarityFrameCount,
} from '../shared/game-data/card-rarity-animation.ts'

const css = renderCardRarityCss()
const frameRules = [...css.matchAll(/^\s*(\d+(?:\.\d+)?)% \{ ([^}]+) \}$/gm)]

function frameRule(frame: number): string {
  const percentage = Number(((frame / cardRarityFrameCount) * 100).toFixed(6))
  const rule = frameRules.find((match) => Number(match[1]) === percentage)?.[2]
  if (!rule) throw new Error(`Missing generated CSS for frame ${frame}`)
  return rule
}

describe('card rarity sprite CSS', () => {
  it('preserves the 64-frame source timing and loops to the first frame', () => {
    expect(css).toContain(
      `animation: ${cardRarityAnimationName} ${cardRarityAnimationDuration}s linear infinite`,
    )
    expect(cardRarityAnimationDuration).toBe(64 / 60)
    expect(frameRules).toHaveLength(65)
    expect(css).toContain(`100% { ${frameRule(0)} }`)
  })

  it('maps row-major frames to discrete atlas transforms', () => {
    expect(frameRule(7)).toContain('transform: translate(-87.5%, 0%)')
    expect(frameRule(8)).toContain('transform: translate(0%, -12.5%)')
    expect(frameRule(63)).toContain('transform: translate(-87.5%, -87.5%)')
    expect(frameRule(0)).toContain('animation-timing-function: steps(1, end)')
  })

  it('moves the transparent atlas with transform instead of paint properties', () => {
    expect(css).toContain(
      '.card-rarity-sprite { width: 800%; height: 800%; background-size: 100% 100%;',
    )
    expect(css).not.toContain('background-position')
    expect(css).not.toContain('clip-path')
  })

  it('disables sprite playback for reduced motion', () => {
    expect(css).toContain(
      '@media (prefers-reduced-motion: reduce) { .card-rarity-sprite { animation: none !important; } }',
    )
  })
})
