import type { DatabaseSync } from 'node:sqlite'

export interface TransformModule<T = unknown> {
  fileName: `${string}.json`
  run(database: DatabaseSync): {
    data: T
    summary: string
  }
}

export interface SourceFieldContext {
  table: string
  field: string
  rowId: string
}
