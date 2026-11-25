import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  cardAttributeSprites,
  cardStatSprites,
} from '../../shared/game-data/cards/icon-sprites.ts'

const atlas = new URL(
  'https://assets.holodori.net/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/',
)
const spriteNames = [
  ...Object.values(cardStatSprites),
  ...Object.values(cardAttributeSprites).filter((name) => name !== undefined),
]

export async function prepareCardIcons(
  outputDirectory: string,
  fetcher = globalThis.fetch,
) {
  const revision = randomUUID()
  async function fetchCurrent(path: string) {
    const url = new URL(path, atlas)
    // Query a fresh cache key: the CDN can retain deleted export paths.
    url.searchParams.set('frontend-build', revision)
    const response = await fetcher(url, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    }).catch((error: unknown) => {
      throw new Error(`Could not fetch card icon asset ${url.pathname}`, {
        cause: error,
      })
    })
    if (!response.ok) {
      throw new Error(
        `Card icon asset ${url.pathname}: HTTP ${response.status}`,
      )
    }
    return response
  }

  const index: unknown = await (await fetchCurrent('index.json')).json()
  if (
    !index ||
    typeof index !== 'object' ||
    !('files' in index) ||
    !Array.isArray(index.files)
  ) {
    throw new Error('Invalid card icon index')
  }
  const files: unknown[] = index.files

  const downloads: Array<{ name: string; bytes: Buffer }> = []
  for (const name of spriteNames) {
    const matches = files.filter(
      (row): row is Record<string, unknown> =>
        row !== null &&
        typeof row === 'object' &&
        'objectName' in row &&
        row.objectName === name &&
        'objectType' in row &&
        row.objectType === 'Sprite' &&
        'role' in row &&
        row.role === 'trimmed',
    )
    const file = matches[0]
    if (
      matches.length !== 1 ||
      typeof file.path !== 'string' ||
      !/^images\/[a-zA-Z0-9_-]+\.webp$/.test(file.path) ||
      typeof file.bytes !== 'number' ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < 20 ||
      file.bytes > 256 * 1024
    ) {
      throw new Error(`Invalid or missing card icon index entry: ${name}`)
    }
    const response = await fetchCurrent(file.path)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (
      bytes.length !== file.bytes ||
      bytes.toString('ascii', 0, 4) !== 'RIFF' ||
      bytes.toString('ascii', 8, 12) !== 'WEBP' ||
      bytes.readUInt32LE(4) !== bytes.length - 8
    ) {
      throw new Error(`Invalid WebP for card icon ${name}: ${file.path}`)
    }
    downloads.push({ name, bytes })
  }

  // Leave previous output untouched if any index entry or download fails.
  await mkdir(outputDirectory, { recursive: true })
  for (const { name, bytes } of downloads) {
    await writeFile(join(outputDirectory, `${name}.webp`), bytes)
  }
}
