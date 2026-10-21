import { describe, expect, it } from 'vitest'
import { buildConnectGraphGrid } from '../shared/game-data/connect-graph.ts'

describe('buildConnectGraphGrid', () => {
  it('reconstructs the six-point Ayame preview with the origin centered', () => {
    const grid = buildConnectGraphGrid([
      { x: -1, y: -1 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: 1 },
    ])
    expect(grid.size).toBe(5)
    expect(grid.cells.filter((cell) => cell.affected)).toHaveLength(6)
    const rows = Array.from({ length: grid.size }, (_, row) =>
      grid.cells
        .filter((cell) => cell.row === row)
        .map((cell) => (cell.origin ? '★' : cell.affected ? '■' : '·'))
        .join(''),
    )
    expect(rows).toEqual(['·····', '·■■··', '·■★■·', '·■■··', '·····'])
  })

  it('renders positive Y above the origin', () => {
    const { cells } = buildConnectGraphGrid([
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ])
    const positive = cells.find((cell) => cell.x === 0 && cell.y === 1)!
    const negative = cells.find((cell) => cell.x === 0 && cell.y === -1)!

    expect(positive.row).toBeLessThan(negative.row)
  })

  it('shifts the origin with a negative X overrun', () => {
    const { size, cells } = buildConnectGraphGrid([
      { x: -2, y: 1 },
      { x: -3, y: 0 },
      { x: -2, y: 0 },
      { x: -1, y: 0 },
      { x: -2, y: -1 },
    ])
    const rows = Array.from({ length: size }, (_, row) =>
      cells
        .filter((cell) => cell.row === row)
        .map((cell) => (cell.origin ? '★' : cell.affected ? '■' : '·'))
        .join(''),
    )

    expect(size).toBe(5)
    expect(rows).toEqual(['·····', '·■···', '■■■★·', '·■···', '·····'])
    expect(cells.find((cell) => cell.origin)).toMatchObject({
      column: 3,
      row: 2,
    })
  })

  it.each([
    [
      { x: 3, y: 0 },
      { column: 4, row: 2 },
      { column: 1, row: 2 },
    ],
    [
      { x: -3, y: 0 },
      { column: 0, row: 2 },
      { column: 3, row: 2 },
    ],
    [
      { x: 0, y: 3 },
      { column: 2, row: 0 },
      { column: 2, row: 3 },
    ],
    [
      { x: 0, y: -3 },
      { column: 2, row: 4 },
      { column: 2, row: 1 },
    ],
  ])('shifts one axis for the overrun at %o', (position, affected, origin) => {
    const { size, cells } = buildConnectGraphGrid([position])

    expect(size).toBe(5)
    expect(cells).toHaveLength(25)
    expect(cells.find((cell) => cell.affected)).toMatchObject(affected)
    expect(cells.find((cell) => cell.origin)).toMatchObject(origin)
  })

  it('shifts both axes independently when both overrun', () => {
    const { size, cells } = buildConnectGraphGrid([
      { x: 3, y: -3 },
      { x: 2, y: -2 },
    ])

    expect(size).toBe(5)
    expect(cells).toHaveLength(25)
    expect(cells.filter((cell) => cell.affected)).toHaveLength(2)
    expect(cells.find((cell) => cell.x === 3 && cell.y === -3)).toMatchObject({
      column: 4,
      row: 4,
      affected: true,
    })
    expect(cells.find((cell) => cell.origin)).toMatchObject({
      column: 1,
      row: 1,
    })
  })
})
