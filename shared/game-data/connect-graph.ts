import type { ConnectPosition } from './skill-tree-connect-effects.ts'

export interface ConnectGraphCell {
  x: number
  y: number
  column: number
  row: number
  affected: boolean
  origin: boolean
}

export interface ConnectGraphGrid {
  size: number
  cells: ConnectGraphCell[]
}

export function buildConnectGraphGrid(
  positions: readonly ConnectPosition[],
): ConnectGraphGrid {
  const size = 5
  const minimum = (axis: 'x' | 'y') =>
    positions.reduce((value, position) => Math.min(value, position[axis]), 0)
  const maximum = (axis: 'x' | 'y') =>
    positions.reduce((value, position) => Math.max(value, position[axis]), 0)
  const start = (axis: 'x' | 'y') => {
    const min = minimum(axis)
    const max = maximum(axis)
    if (min < -2) return min
    if (max > 2) return max - (size - 1)
    return -2
  }
  const startX = start('x')
  const startY = start('y')
  const endX = startX + size - 1
  const endY = startY + size - 1
  const affected = new Set(positions.map(({ x, y }) => `${x},${y}`))
  const cells: ConnectGraphCell[] = []

  for (let y = endY; y >= startY; y -= 1) {
    for (let x = startX; x <= endX; x += 1) {
      cells.push({
        x,
        y,
        column: x - startX,
        row: endY - y,
        affected: affected.has(`${x},${y}`),
        origin: x === 0 && y === 0,
      })
    }
  }

  return { size, cells }
}
