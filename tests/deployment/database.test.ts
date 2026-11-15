import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  fetchDatabase,
  isCurrentDeployment,
  resolveDatabaseSource,
} from '../../scripts/deployment/database.ts'

const version = 'a'.repeat(64)
const tag = `master-${version}`
const commit = 'b'.repeat(40)
const frontendCommit = 'c'.repeat(40)
const contents = 'SQLite format 3\0verified fixture'
const sha256 = createHash('sha256').update(contents).digest('hex')
const directories: string[] = []

function fixture(
  options: {
    body?: string
    state?: string
    digest?: string
    latestTag?: string
    frontend?: string
  } = {},
) {
  return (async (input: string | URL | Request) => {
    const url = String(input)
    if (url.includes('/releases/download/'))
      return new Response(options.body ?? contents)
    if (url.endsWith('/frontend/commits/main'))
      return Response.json({ sha: options.frontend ?? frontendCommit })
    if (url.includes('/releases/'))
      return Response.json({
        id: 12,
        tag_name: options.latestTag ?? tag,
        draft: false,
        prerelease: false,
        assets: [
          {
            id: 34,
            name: 'master.sqlite',
            state: options.state ?? 'uploaded',
            digest: options.digest ?? `sha256:${sha256}`,
          },
        ],
      })
    if (url.includes('/commits/')) return Response.json({ sha: commit })
    if (url.includes('/contents/report.json'))
      return Response.json({
        encoding: 'base64',
        content: Buffer.from(
          JSON.stringify({
            success: true,
            masterVersion: version,
            outputs: { masterSqlite: { sha256 } },
          }),
        ).toString('base64'),
      })
    throw new Error(`Unexpected fixture URL ${url}`)
  }) as typeof fetch
}

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe('deployment database inputs', () => {
  it('pins the release, commit and checksum and downloads that exact asset', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'holodori-deploy-'))
    directories.push(directory)
    const source = await fetchDatabase(directory, {
      tag,
      commit,
      sha256,
      fetcher: fixture(),
    })
    expect(source).toMatchObject({
      tag,
      commit,
      sha256,
      releaseId: 12,
      assetId: 34,
    })
    expect(await readFile(join(directory, 'master.sqlite'), 'utf8')).toBe(
      contents,
    )
    expect(
      JSON.parse(
        await readFile(join(directory, 'database-source.json'), 'utf8'),
      ),
    ).toEqual(source)
  })

  it('rejects partial uploads and mismatched provenance before downloading', async () => {
    await expect(
      resolveDatabaseSource({ fetcher: fixture({ state: 'new' }) }),
    ).rejects.toThrow('finished uploading')
    await expect(
      resolveDatabaseSource({ commit: 'd'.repeat(40), fetcher: fixture() }),
    ).rejects.toThrow('commit does not match')
    await expect(
      resolveDatabaseSource({ sha256: 'd'.repeat(64), fetcher: fixture() }),
    ).rejects.toThrow('Dispatched checksum')
    await expect(
      resolveDatabaseSource({
        fetcher: fixture({ digest: `sha256:${'d'.repeat(64)}` }),
      }),
    ).rejects.toThrow('asset checksum')
    await expect(
      resolveDatabaseSource({ tag: '../../main', fetcher: fixture() }),
    ).rejects.toThrow('Invalid database tag')
  })

  it('preserves a usable database and removes partial files after checksum failure', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'holodori-deploy-'))
    directories.push(directory)
    await writeFile(join(directory, 'master.sqlite'), 'previous database')
    await expect(
      fetchDatabase(directory, { fetcher: fixture({ body: 'corrupted' }) }),
    ).rejects.toThrow('checksum mismatch')
    expect(await readFile(join(directory, 'master.sqlite'), 'utf8')).toBe(
      'previous database',
    )
    expect(await readdir(directory)).toEqual(['master.sqlite'])
  })

  it('blocks a stale database or frontend commit from deploying over newer content', async () => {
    const source = await resolveDatabaseSource({ fetcher: fixture() })
    expect(
      await isCurrentDeployment(source, frontendCommit, { fetcher: fixture() }),
    ).toBe(true)
    expect(
      await isCurrentDeployment(source, frontendCommit, {
        fetcher: fixture({ frontend: 'd'.repeat(40) }),
      }),
    ).toBe(false)
    expect(
      await isCurrentDeployment(
        { ...source, tag: `${tag}-run-1` },
        frontendCommit,
        { fetcher: fixture() },
      ),
    ).toBe(false)
  })

  it('fails closed when GitHub metadata cannot be read', async () => {
    const fetcher = (async () =>
      new Response('', { status: 503 })) as typeof fetch
    await expect(resolveDatabaseSource({ fetcher })).rejects.toThrow('(503)')
  })
})
