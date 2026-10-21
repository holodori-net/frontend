const VERSION = 'g1.'
export const CARD_SKILL_QUERY_MAX_OUTPUT_BYTES = 256 * 1024

export function isCardSkillQuerySupported(): boolean {
  return (
    typeof CompressionStream !== 'undefined' &&
    typeof DecompressionStream !== 'undefined' &&
    typeof TextEncoder !== 'undefined' &&
    typeof TextDecoder !== 'undefined' &&
    typeof btoa === 'function' &&
    typeof atob === 'function'
  )
}

export async function encodeCardSkillSelection(
  ids: readonly string[],
): Promise<string | undefined> {
  const names = [...new Set(ids)].sort()
  if (!names.length) return undefined
  assertSupported()
  const input = new TextEncoder().encode(names.join('\n'))
  if (input.byteLength > CARD_SKILL_QUERY_MAX_OUTPUT_BYTES) {
    throw new Error('Skill query exceeds the 256 KiB decoded size limit.')
  }
  const compressed = await readCompressed(
    new Blob([toArrayBuffer(input)])
      .stream()
      .pipeThrough(new CompressionStream('gzip')),
  )
  return `${VERSION}${encodeBase64Url(compressed)}`
}

export async function decodeCardSkillSelection(
  value: string,
): Promise<string[]> {
  if (!value.startsWith(VERSION)) {
    throw new Error('Unsupported skill query version; expected g1.')
  }
  assertSupported()
  const encoded = value.slice(VERSION.length)
  const compressed = decodeBase64Url(encoded)
  const stream = new Blob([toArrayBuffer(compressed)])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
  const output = await readDecompressed(stream)
  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(output)
  if (!decoded) return []
  return [...new Set(decoded.split('\n').filter(Boolean))].sort()
}

function assertSupported() {
  if (!isCardSkillQuerySupported()) {
    throw new Error('This browser does not support gzip skill queries.')
  }
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

function decodeBase64Url(value: string): Uint8Array {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new Error('Invalid base64url skill query.')
  }
  try {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    throw new Error('Invalid base64url skill query.')
  }
}

async function readDecompressed(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > CARD_SKILL_QUERY_MAX_OUTPUT_BYTES) {
        void reader.cancel().catch(() => {})
        throw new Error('Skill query exceeds the 256 KiB decoded size limit.')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return concat(chunks, size)
}

async function readCompressed(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return concat(chunks, size)
}

function concat(chunks: Uint8Array[], size: number) {
  const result = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}
