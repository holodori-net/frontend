import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import {
  transformCardGrowth,
  transformCards,
  transformCharacters,
} from './transform.ts'

const repositoryDirectory = fileURLToPath(new URL('../..', import.meta.url))
const inputPath = resolve(repositoryDirectory, '.data/master.sqlite')
const outputDirectory = resolve(repositoryDirectory, 'public/data')

async function main() {
  let database: DatabaseSync | undefined
  try {
    console.info(`Reading ${inputPath}`)
    database = new DatabaseSync(inputPath, { readOnly: true })
    const characters = transformCharacters(database)
    const cards = transformCards(database)
    const growth = transformCardGrowth(database)
    await mkdir(outputDirectory, { recursive: true })
    await Promise.all([
      writeJson('characters.json', characters),
      writeJson('cards.json', cards),
      writeJson('card-growth.json', growth),
    ])
    console.info(
      `Wrote ${resolve(outputDirectory, 'characters.json')} (${characters.length} characters), ${resolve(outputDirectory, 'cards.json')} (${cards.length} cards), ${resolve(outputDirectory, 'card-growth.json')} (${Object.keys(growth.levels).length} level groups, ${Object.keys(growth.levelLimits).length} level limit groups, ${Object.keys(growth.potentials).length} potential groups)`,
    )
  } catch (error) {
    console.error(`Data transformation failed using ${inputPath}:`, error)
    process.exitCode = 1
  } finally {
    database?.close()
  }
}

await main()

async function writeJson(name: string, data: unknown) {
  const path = resolve(outputDirectory, name)
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`)
}
