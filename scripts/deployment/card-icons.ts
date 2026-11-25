import type { CardStatKey } from '../../shared/game-data/cards/list-data.ts'

const atlas =
  'https://assets.holodori.net/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/'

export interface CardIconUrls {
  stats: Record<CardStatKey, string>
  attributes: Record<1 | 2 | 3, string>
}

function mapCardIcons(urlFor: (name: string) => string): CardIconUrls {
  return {
    stats: {
      performance: urlFor('ui_999_ico_performance'),
      technique: urlFor('ui_999_ico_technique'),
      sense: urlFor('ui_999_ico_sense'),
    },
    attributes: {
      1: urlFor('ui_999_ico_element_cute_cl'),
      2: urlFor('ui_999_ico_element_pure_cl'),
      3: urlFor('ui_999_ico_element_happy_cl'),
    },
  }
}

type Sprite = {
  objectName: string
  objectType: string
  role: string
  path: string
}

export async function resolveCardIconUrls(
  fetcher = fetch,
): Promise<CardIconUrls> {
  const response = await fetcher(
    `${atlas}index.json?frontend-build=${Date.now()}`,
    {
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    },
  )
  if (!response.ok) throw new Error(`Card icon index: HTTP ${response.status}`)
  const index = (await response.json()) as { files?: Sprite[] } | null
  const files = index?.files
  if (!Array.isArray(files)) throw new Error('Invalid card icon index')

  return mapCardIcons((name) => {
    const [file, duplicate] = files.filter(
      (item) =>
        item?.objectName === name &&
        item.objectType === 'Sprite' &&
        item.role === 'trimmed',
    )
    if (
      !file ||
      duplicate ||
      typeof file.path !== 'string' ||
      !/^images\/[\w-]+\.webp$/.test(file.path)
    ) {
      throw new Error(`Invalid or missing card icon index entry: ${name}`)
    }
    return `${atlas}${file.path}`
  })
}
