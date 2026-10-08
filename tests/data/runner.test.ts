import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runTransforms } from '../../scripts/data/runner.ts'
import type { TransformModule } from '../../scripts/data/contract.ts'

let database: DatabaseSync
let directory: string

beforeEach(async () => {
  database = new DatabaseSync(':memory:')
  directory = await mkdtemp(join(tmpdir(), 'holodori-data-runner-'))
  vi.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(async () => {
  database.close()
  await rm(directory, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe('data transform runner', () => {
  it('writes module results as formatted JSON and reports each output', async () => {
    const firstPath = join(directory, 'first.json')
    await writeFile(firstPath, 'previous data')
    const second = vi.fn(() => ({
      data: { ids: ['b', 'a'] },
      summary: '2 IDs',
    }))
    const modules: TransformModule[] = [
      {
        fileName: 'first.json',
        run: () => ({ data: [{ id: 'one' }], summary: '1 entry' }),
      },
      { fileName: 'second.json', run: second },
    ]

    await runTransforms(database, modules, directory)

    expect(second).toHaveBeenCalledWith(database)
    expect(await readFile(firstPath, 'utf8')).toBe(
      '[\n  {\n    "id": "one"\n  }\n]\n',
    )
    expect(await readFile(join(directory, 'second.json'), 'utf8')).toBe(
      '{\n  "ids": [\n    "b",\n    "a"\n  ]\n}\n',
    )
    expect(console.info).toHaveBeenCalledWith(`Wrote ${firstPath} (1 entry)`)
    expect(console.info).toHaveBeenCalledWith(
      `Wrote ${join(directory, 'second.json')} (2 IDs)`,
    )
  })

  it('retains every existing output when a later module fails and preserves its cause', async () => {
    const firstPath = join(directory, 'first.json')
    const secondPath = join(directory, 'second.json')
    await writeFile(firstPath, 'first previous data')
    await writeFile(secondPath, 'second previous data')
    const cause = new Error('Missing ind translation')
    const modules: TransformModule[] = [
      {
        fileName: 'first.json',
        run: () => ({ data: ['new data'], summary: '1 entry' }),
      },
      {
        fileName: 'second.json',
        run: () => {
          throw cause
        },
      },
    ]

    await expect(
      runTransforms(database, modules, directory),
    ).rejects.toMatchObject({
      message: 'Data transformation failed for second.json',
      cause,
    })
    expect(await readFile(firstPath, 'utf8')).toBe('first previous data')
    expect(await readFile(secondPath, 'utf8')).toBe('second previous data')
  })

  it('reports a failed write with the output path and underlying filesystem error', async () => {
    const path = join(directory, 'blocked.json')
    await mkdir(path)
    const modules: TransformModule[] = [
      {
        fileName: 'blocked.json',
        run: () => ({ data: [], summary: '0 entries' }),
      },
    ]

    await expect(
      runTransforms(database, modules, directory),
    ).rejects.toMatchObject({
      message: `Failed to write ${path}`,
      cause: { code: 'EISDIR' },
    })
  })
})
