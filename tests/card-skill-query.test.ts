import { describe, expect, it } from 'vitest'
import {
  CARD_SKILL_QUERY_MAX_OUTPUT_BYTES,
  decodeCardSkillSelection,
  encodeCardSkillSelection,
  isCardSkillQuerySupported,
} from '../shared/game-data/card-skill-query.ts'

describe('card skill query codec', () => {
  it('encodes sorted unique UTF-8 IDs and decodes them through gzip', async () => {
    expect(isCardSkillQuerySupported()).toBe(true)
    const encoded = await encodeCardSkillSelection([
      'skill:z',
      '技能:a',
      'skill:z',
    ])
    expect(encoded?.startsWith('g1.')).toBe(true)
    expect(await decodeCardSkillSelection(encoded!)).toEqual(
      ['skill:z', '技能:a'].sort(),
    )
  })

  it('omits an empty selection', async () => {
    expect(await encodeCardSkillSelection([])).toBeUndefined()
  })

  it('rejects an encoded selection whose UTF-8 payload exceeds the decoder cap', async () => {
    await expect(
      encodeCardSkillSelection([
        'x'.repeat(CARD_SKILL_QUERY_MAX_OUTPUT_BYTES + 1),
      ]),
    ).rejects.toThrow(/256 KiB/i)
  })

  it('rejects unsupported versions, malformed base64url and corrupt gzip', async () => {
    await expect(decodeCardSkillSelection('g2.abc')).rejects.toThrow(/version/i)
    await expect(decodeCardSkillSelection('g1.!')).rejects.toThrow(/base64url/i)
    await expect(decodeCardSkillSelection('g1.YWJj')).rejects.toThrow()
  })

  it('caps decompressed output while reading the stream', async () => {
    const payload = new TextEncoder().encode(
      'x'.repeat(CARD_SKILL_QUERY_MAX_OUTPUT_BYTES + 1),
    )
    const compressed = new Blob([payload])
      .stream()
      .pipeThrough(new CompressionStream('gzip'))
    const reader = compressed.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    const bytes = new Uint8Array(
      chunks.reduce((size, chunk) => size + chunk.length, 0),
    )
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    const value = `g1.${btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')}`
    await expect(decodeCardSkillSelection(value)).rejects.toThrow(/256 KiB/i)
  })

  it('rejects invalid UTF-8 data', async () => {
    const stream = new Blob([new Uint8Array([0xff])])
      .stream()
      .pipeThrough(new CompressionStream('gzip'))
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    const bytes = new Uint8Array(
      chunks.reduce((size, chunk) => size + chunk.length, 0),
    )
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    const value = `g1.${btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')}`
    await expect(decodeCardSkillSelection(value)).rejects.toThrow()
  })
})
