import {
  cardRarityAnimationDuration,
  cardRarityAnimationName,
  cardRarityFrameCount,
} from '../../shared/game-data/card-rarity-animation.ts'

const gridSize = Math.sqrt(cardRarityFrameCount)

function formatPercentage(value: number): string {
  return `${Number(value.toFixed(6))}%`
}

function renderFrame(frame: number): string {
  const column = frame % gridSize
  const row = Math.floor(frame / gridSize)
  const translateX = formatPercentage(-(column / gridSize) * 100)
  const translateY = formatPercentage(-(row / gridSize) * 100)

  return `transform: translate(${translateX}, ${translateY}); animation-timing-function: steps(1, end);`
}

export function renderCardRarityCss(): string {
  const keyframes = Array.from({ length: cardRarityFrameCount }, (_, frame) => {
    const percentage = formatPercentage((frame / cardRarityFrameCount) * 100)
    return `  ${percentage} { ${renderFrame(frame)} }`
  })
  keyframes.push(`  100% { ${renderFrame(0)} }`)

  return [
    `.card-rarity-sprite { width: ${gridSize * 100}%; height: ${gridSize * 100}%; background-size: 100% 100%; animation: ${cardRarityAnimationName} ${cardRarityAnimationDuration}s linear infinite; }`,
    `@keyframes ${cardRarityAnimationName} {\n${keyframes.join('\n')}\n}`,
    '@media (prefers-reduced-motion: reduce) { .card-rarity-sprite { animation: none !important; } }',
  ].join('\n\n')
}
