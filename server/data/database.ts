import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/node-sqlite'

export function createGameDatabase(client: DatabaseSync) {
  return drizzle({ client })
}

export type GameDatabase = ReturnType<typeof createGameDatabase>

export function withGameDatabase<T>(
  operation: (database: GameDatabase) => T,
  path = resolve(process.cwd(), '.data/master.sqlite'),
): T {
  const client = new DatabaseSync(path, { readOnly: true })
  try {
    return operation(createGameDatabase(client))
  } finally {
    client.close()
  }
}
