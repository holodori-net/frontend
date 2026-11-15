import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const repository = 'holodori-net/android-database'
const apiOrigin = 'https://api.github.com'
const tagPattern = /^master-[0-9a-f]{64}(?:-[A-Za-z0-9.-]+)?$/
const commitPattern = /^[0-9a-f]{40}$/
const checksumPattern = /^[0-9a-f]{64}$/

export interface DatabaseSource {
  repository: string
  tag: string
  commit: string
  masterVersion: string
  sha256: string
  releaseId: number
  assetId: number
}

interface Options {
  tag?: string
  commit?: string
  sha256?: string
  token?: string
  fetcher?: typeof fetch
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a GitHub/database metadata object')
  return value as Record<string, unknown>
}

function matching(value: unknown, pattern: RegExp, name: string): string {
  if (typeof value !== 'string' || !pattern.test(value))
    throw new Error(`Invalid ${name}`)
  return value
}

function identifier(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0)
    throw new Error('Invalid release/asset ID')
  return value
}

async function getJson(path: string, options: Options): Promise<unknown> {
  const response = await (options.fetcher ?? fetch)(`${apiOrigin}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok)
    throw new Error(
      `GitHub metadata request failed: ${path} (${response.status})`,
    )
  return response.json()
}

export async function resolveDatabaseSource(
  options: Options = {},
): Promise<DatabaseSource> {
  if (options.tag) matching(options.tag, tagPattern, 'database tag')
  if (options.commit) matching(options.commit, commitPattern, 'database commit')
  if (options.sha256)
    matching(options.sha256, checksumPattern, 'database checksum')
  const release = object(
    await getJson(
      `/repos/${repository}/releases/${options.tag ? `tags/${options.tag}` : 'latest'}`,
      options,
    ),
  )
  const tag = matching(release.tag_name, tagPattern, 'release tag')
  if (release.draft !== false || release.prerelease !== false)
    throw new Error('Database release must be published and stable')
  if (!Array.isArray(release.assets)) throw new Error('Missing release assets')
  const asset = release.assets
    .map(object)
    .find((a) => a.name === 'master.sqlite')
  if (!asset || asset.state !== 'uploaded')
    throw new Error('master.sqlite has not finished uploading')
  const revision = object(
    await getJson(`/repos/${repository}/commits/${tag}`, options),
  )
  const commit = matching(revision.sha, commitPattern, 'release commit')
  if (options.commit && options.commit !== commit)
    throw new Error('Database commit does not match the release tag')
  const file = object(
    await getJson(
      `/repos/${repository}/contents/report.json?ref=${commit}`,
      options,
    ),
  )
  if (file.encoding !== 'base64' || typeof file.content !== 'string')
    throw new Error('Invalid database report file')
  const report = object(
    JSON.parse(Buffer.from(file.content, 'base64').toString()),
  )
  const masterVersion = matching(
    report.masterVersion,
    checksumPattern,
    'master version',
  )
  const sha256 = matching(
    object(object(report.outputs).masterSqlite).sha256,
    checksumPattern,
    'reported SQLite checksum',
  )
  if (report.success !== true || !tag.startsWith(`master-${masterVersion}`))
    throw new Error('Release and database report do not match')
  if (options.sha256 && options.sha256 !== sha256)
    throw new Error('Dispatched checksum does not match the database report')
  if (asset.digest !== `sha256:${sha256}`)
    throw new Error('Release asset checksum does not match the database report')
  return {
    repository,
    tag,
    commit,
    masterVersion,
    sha256,
    releaseId: identifier(release.id),
    assetId: identifier(asset.id),
  }
}

export async function fetchDatabase(
  directory: string,
  options: Options = {},
): Promise<DatabaseSource> {
  const source = await resolveDatabaseSource(options)
  await mkdir(directory, { recursive: true })
  const temporary = join(directory, `master.sqlite.${crypto.randomUUID()}.tmp`)
  try {
    const url = `https://github.com/${repository}/releases/download/${source.tag}/master.sqlite`
    const response = await (options.fetcher ?? fetch)(url, {
      signal: AbortSignal.timeout(300_000),
    })
    if (!response.ok || !response.body)
      throw new Error(`SQLite download failed (${response.status})`)
    const hash = createHash('sha256')
    const stream = Readable.fromWeb(response.body)
    stream.on('data', (chunk: Buffer) => hash.update(chunk))
    await pipeline(stream, createWriteStream(temporary, { flags: 'wx' }))
    if (hash.digest('hex') !== source.sha256)
      throw new Error('Downloaded SQLite checksum mismatch')
    await rename(temporary, join(directory, 'master.sqlite'))
    await writeFile(
      join(directory, 'database-source.json'),
      `${JSON.stringify(source, null, 2)}\n`,
    )
    return source
  } finally {
    await rm(temporary, { force: true })
  }
}

export async function readDatabaseSource(
  directory: string,
): Promise<DatabaseSource> {
  const data = object(
    JSON.parse(await readFile(join(directory, 'database-source.json'), 'utf8')),
  )
  if (data.repository !== repository)
    throw new Error('Invalid database repository')
  return {
    repository,
    tag: matching(data.tag, tagPattern, 'database tag'),
    commit: matching(data.commit, commitPattern, 'database commit'),
    masterVersion: matching(
      data.masterVersion,
      checksumPattern,
      'master version',
    ),
    sha256: matching(data.sha256, checksumPattern, 'database checksum'),
    releaseId: identifier(data.releaseId),
    assetId: identifier(data.assetId),
  }
}

export async function isCurrentDeployment(
  source: DatabaseSource,
  frontendCommit: string,
  options: Options = {},
): Promise<boolean> {
  matching(frontendCommit, commitPattern, 'frontend commit')
  const latest = await resolveDatabaseSource({
    token: options.token,
    fetcher: options.fetcher,
  })
  const frontend = object(
    await getJson('/repos/holodori-net/frontend/commits/main', options),
  )
  return (
    latest.tag === source.tag &&
    latest.commit === source.commit &&
    latest.sha256 === source.sha256 &&
    frontend.sha === frontendCommit
  )
}
