import type { SourceFieldContext } from './source-context.ts'

export function parseJsonArray<T = string>(
  value: string | null,
  context: SourceFieldContext,
): T[] {
  if (value === null) return []
  try {
    return JSON.parse(value) as T[]
  } catch (cause) {
    throw new Error(
      `Invalid JSON in ${context.table}.${context.field} for row ${context.rowId}`,
      { cause },
    )
  }
}
