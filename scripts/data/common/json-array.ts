import type { SourceFieldContext } from '../contract.ts'

export function parseJsonArray(
  value: string | null,
  context: SourceFieldContext,
): string[] {
  if (value === null) return []
  try {
    return JSON.parse(value) as string[]
  } catch (cause) {
    throw new Error(
      `Invalid JSON in ${context.table}.${context.field} for row ${context.rowId}`,
      { cause },
    )
  }
}
