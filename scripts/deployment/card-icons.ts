import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  cardIconDirectory,
  cardIconSpriteNames,
} from '../../shared/game-data/cards/assets.ts'

const atlas =
  'https://assets.holodori.net/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/'

type Sprite = {
  objectType: string
  role: string
  objectName: string
  path: string
  bytes: number
}

export async function prepareCardIcons(output: string, fetcher = fetch) {
  const revision = Date.now()
  async function download(path: string) {
    // The CDN can still serve deleted exports from cache.
    const response = await fetcher(
      `${atlas}${path}?frontend-build=${revision}`,
      {
        signal: AbortSignal.timeout(10_000),
        redirect: 'error',
      },
    )
    if (!response.ok)
      throw new Error(`Card icon asset ${path}: HTTP ${response.status}`)
    return response
  }

  const index = (await (await download('index.json')).json()) as {
    files?: Sprite[]
  } | null
  if (!Array.isArray(index?.files)) throw new Error('Invalid card icon index')

  const icons = new Map<string, Buffer>()
  for (const name of cardIconSpriteNames) {
    const [file, duplicate] = index.files.filter(
      (row) =>
        row?.objectName === name &&
        row.objectType === 'Sprite' &&
        row.role === 'trimmed',
    )
    if (
      !file ||
      duplicate ||
      typeof file.path !== 'string' ||
      !/^images\/[\w-]+\.webp$/.test(file.path)
    ) {
      throw new Error(`Invalid or missing card icon index entry: ${name}`)
    }
    const bytes = Buffer.from(await (await download(file.path)).arrayBuffer())
    if (
      bytes.length !== file.bytes ||
      bytes.toString('ascii', 0, 4) !== 'RIFF' ||
      bytes.toString('ascii', 8, 12) !== 'WEBP'
    ) {
      throw new Error(`Invalid WebP for card icon ${name}: ${file.path}`)
    }
    icons.set(name, bytes)
  }

  await mkdir(output, { recursive: true })
  for (const [name, bytes] of icons)
    await writeFile(join(output, `${name}.webp`), bytes)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const output = join('public', cardIconDirectory)
  await prepareCardIcons(output)
  console.info(`Prepared card icons in ${output}`)
}
