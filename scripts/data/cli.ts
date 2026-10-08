import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { transformModules } from './registry.ts'
import { runTransforms } from './runner.ts'

const repositoryDirectory = fileURLToPath(new URL('../..', import.meta.url))
const inputPath = resolve(repositoryDirectory, '.data/master.sqlite')
const outputDirectory = resolve(repositoryDirectory, 'public/data')

async function main() {
  let database: DatabaseSync | undefined
  try {
    console.info(`Reading ${inputPath}`)
    database = new DatabaseSync(inputPath, { readOnly: true })
    await runTransforms(database, transformModules, outputDirectory)
  } catch (error) {
    console.error(`Data transformation failed using ${inputPath}:`, error)
    process.exitCode = 1
  } finally {
    database?.close()
  }
}

await main()
