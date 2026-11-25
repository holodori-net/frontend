import type { CardStatKey } from '../../shared/game-data/cards/list-data.ts'

const atlas =
  'https://assets.holodori.net/apk/bundle/71a80fc31d22653f28db3f211e30ddde.bundle/'

interface CardIconUrls {
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

// Keep dev, type generation, and server builds independent of the index.
const previewFiles: Record<string, string> = {
  ui_999_ico_performance:
    '7e39167eb13b6a1dafb5f267491513fe2daedec385659957bfd8739e5840251c',
  ui_999_ico_technique:
    '7f738b07a9bf9f167ef142c9a0c4edad88b2708ad24a39f67cbf51154e8b5cb5',
  ui_999_ico_sense:
    '0c443e1bb9913a8e9bd8576369edf71749fca831bc92ef96d00fe851a2e85d81',
  ui_999_ico_element_cute_cl:
    '96acfe5d4ef3d24dbd3f90d9437a915a26efa65fd21fe5e89020b07b82659ec4',
  ui_999_ico_element_pure_cl:
    '99a3990c99297470a3fb8ab366f6c8cee9839e062e7dfaaa6a904c04a99e4555',
  ui_999_ico_element_happy_cl:
    'af06971ad54a0544ba92d7ef4e067c6608ad65a1eab35a22eb80835925e21a4c',
}
export const defaultCardIconUrls = mapCardIcons(
  (name) => `${atlas}images/${previewFiles[name]}.webp`,
)

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
