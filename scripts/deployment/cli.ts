import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  fetchDatabase,
  isCurrentDeployment,
  readDatabaseSource,
} from './database.ts'

const options = {
  tag: process.env.DATABASE_TAG || undefined,
  commit: process.env.DATABASE_COMMIT || undefined,
  sha256: process.env.DATABASE_SHA256 || undefined,
  token: process.env.GH_TOKEN || undefined,
}
const command = process.argv[2]
if (command === 'fetch') {
  const source = await fetchDatabase('.data', options)
  console.info(JSON.stringify({ event: 'database-downloaded', ...source }))
} else if (command === 'version') {
  const database = await readDatabaseSource('.data')
  const frontendCommit = process.env.GITHUB_SHA
  if (!frontendCommit || !/^[0-9a-f]{40}$/.test(frontendCommit))
    throw new Error('GITHUB_SHA is required for deployment provenance')
  await mkdir('.output/public', { recursive: true })
  await writeFile(
    join('.output/public', 'version.json'),
    `${JSON.stringify(
      {
        frontendCommit,
        database,
        builtAt: new Date().toISOString(),
        workflowRun: `https://github.com/holodori-net/frontend/actions/runs/${process.env.GITHUB_RUN_ID}`,
      },
      null,
      2,
    )}\n`,
  )
} else if (command === 'current') {
  const source = await readDatabaseSource('.data')
  const current = await isCurrentDeployment(
    source,
    process.env.GITHUB_SHA ?? '',
    options,
  )
  console.info(
    JSON.stringify({
      event: 'deployment-current',
      current,
      databaseTag: source.tag,
    }),
  )
  if (process.env.GITHUB_OUTPUT)
    await appendFile(process.env.GITHUB_OUTPUT, `current=${current}\n`)
  else if (!current) process.exitCode = 1
} else {
  throw new Error('Usage: node scripts/deployment/cli.ts fetch|version|current')
}
