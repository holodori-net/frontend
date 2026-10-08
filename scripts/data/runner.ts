import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type { TransformModule } from './contract.ts'

export async function runTransforms(
  database: DatabaseSync,
  modules: readonly TransformModule[],
  outputDirectory: string,
): Promise<void> {
  const results = modules.map((module) => {
    console.info(`Transforming ${module.fileName}`)
    try {
      return { fileName: module.fileName, ...module.run(database) }
    } catch (cause) {
      throw new Error(`Data transformation failed for ${module.fileName}`, {
        cause,
      })
    }
  })

  await mkdir(outputDirectory, { recursive: true })
  await Promise.all(
    results.map(async ({ fileName, data, summary }) => {
      const path = resolve(outputDirectory, fileName)
      try {
        await writeFile(path, `${JSON.stringify(data, null, 2)}\n`)
      } catch (cause) {
        throw new Error(`Failed to write ${path}`, { cause })
      }
      console.info(`Wrote ${path} (${summary})`)
    }),
  )
}
