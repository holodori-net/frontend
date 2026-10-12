import type { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/node-sqlite'

export function createGameDatabase(client: DatabaseSync) {
  return drizzle({ client })
}

export type GameDatabase = ReturnType<typeof createGameDatabase>
