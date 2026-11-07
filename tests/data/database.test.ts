import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { withGameDatabase } from '../../server/data/database.ts'

describe('withGameDatabase', () => {
  let directory: string | undefined

  afterEach(async () => {
    vi.restoreAllMocks()
    if (directory) await rm(directory, { recursive: true, force: true })
    directory = undefined
  })

  async function createDatabasePath() {
    directory = await mkdtemp(join(tmpdir(), 'holodori-database-'))
    const path = join(directory, 'master.sqlite')
    const setup = new DatabaseSync(path)
    setup.exec(
      "CREATE TABLE sample (value TEXT); INSERT INTO sample VALUES ('ok')",
    )
    setup.close()
    return path
  }

  it('opens read-only and closes after a successful callback', async () => {
    const path = await createDatabasePath()
    const close = vi.spyOn(DatabaseSync.prototype, 'close')

    expect(
      withGameDatabase((database) => {
        expect(() =>
          database.$client.exec('CREATE TABLE forbidden (id INTEGER)'),
        ).toThrow()
        return database.$client.prepare('SELECT value FROM sample').get()
      }, path),
    ).toEqual({ value: 'ok' })
    expect(close).toHaveBeenCalledOnce()
  })

  it('closes after a callback throws and preserves the original error', async () => {
    const path = await createDatabasePath()
    const close = vi.spyOn(DatabaseSync.prototype, 'close')
    const failure = new Error('callback failed')
    let caught: unknown

    try {
      withGameDatabase(() => {
        throw failure
      }, path)
    } catch (error) {
      caught = error
    }
    expect(caught).toBe(failure)
    expect(close).toHaveBeenCalledOnce()
  })

  it('does not create a missing database file', async () => {
    directory = await mkdtemp(join(tmpdir(), 'holodori-database-'))
    const path = join(directory, 'missing.sqlite')
    expect(() => withGameDatabase(() => 'unreachable', path)).toThrow(
      'unable to open database file',
    )
    expect(() => new DatabaseSync(path, { readOnly: true })).toThrow()
  })
})
