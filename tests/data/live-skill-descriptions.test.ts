import { describe, expect, it, vi } from 'vitest'
import { gameLocales } from '../../shared/language.ts'
import type { LocalizedText } from '../../shared/game-data/localized-text.ts'
import type {
  DescriptionCatalog,
  DescriptionTemplate,
  PendingDescription,
} from '../../shared/game-data/live-skills.ts'
import {
  inferSkillDescription,
  type DescriptionCandidate,
} from '../../server/data/live-skill-descriptions.ts'
import { renderSkillDescription } from '../../shared/game-data/live-skill-description.ts'

function localized(text: string): LocalizedText {
  return Object.fromEntries(
    gameLocales.map((locale) => [locale, text]),
  ) as LocalizedText
}

function catalog(): DescriptionCatalog {
  return {
    templates: {},
    labels: { character: {}, group: {}, attribute: {}, judgement: {} },
  }
}

function candidate(
  name: string,
  value: DescriptionCandidate['value'],
  text: string,
): DescriptionCandidate {
  return { name, value, text: localized(text) }
}

describe('live skill template inference', () => {
  it('protects the complete entity before replacing equal numeric values', () => {
    const descriptions = catalog()
    const result = inferSkillDescription(
      {
        domain: 'effect',
        type: 8,
        table: 'Effect',
        key: 'one',
        text: localized('Team 15: 15 members gain 15%'),
        candidates: [
          candidate(
            'target',
            { kind: 'target', id: 'team' },
            'Team 15: 15 members',
          ),
          candidate('percent', 15, '15'),
        ],
      },
      descriptions,
      [],
      {},
    )
    expect(result?.params.percent).toBe(15)
    expect(descriptions.templates[result!.templateId]!.text.eng).toBe(
      '{target} gain {percent}%',
    )
  })

  it('keeps name digits, complete decimals, and larger numbers intact', () => {
    const descriptions = catalog()
    const pending: PendingDescription[] = []
    const result = inferSkillDescription(
      {
        domain: 'target',
        type: 4,
        table: 'Target',
        key: 'one',
        text: localized('Gen 1 has 1 member; 11, 1.5, 1e3 and 1,000 remain'),
        candidates: [
          candidate('group', { kind: 'group', id: 'gen1' }, 'Gen 1'),
          candidate('count', 1, '1'),
        ],
      },
      descriptions,
      pending,
      {},
    )
    expect(pending).toEqual([])
    expect(descriptions.templates[result!.templateId]!.text.eng).toBe(
      '{group} has {count} member; 11, 1.5, 1e3 and 1,000 remain',
    )
  })

  it('shares matching six-language patterns while retaining variants of the same type', () => {
    const descriptions = catalog()
    const infer = (text: string, count: number, type = 4) =>
      inferSkillDescription(
        {
          domain: 'target',
          type,
          table: 'Target',
          key: text,
          text: localized(text),
          candidates: [candidate('count', count, String(count))],
        },
        descriptions,
        [],
      )!
    const first = infer('1 members', 1)
    const second = infer('2 members', 2)
    const variant = infer('Members: 2', 2)
    const otherType = infer('2 members', 2, 5)
    expect(first.templateId).toBe(second.templateId)
    expect(first.templateId).not.toBe(variant.templateId)
    expect(first.templateId).not.toBe(otherType.templateId)
    expect(Object.keys(descriptions.templates)).toHaveLength(3)
  })

  it('does not merge different entity meanings or differing translations', () => {
    const descriptions = catalog()
    const input = {
      domain: 'trigger' as const,
      type: 1,
      table: 'Trigger',
      key: 'one',
      text: localized('A leads'),
      candidates: [candidate('entity', { kind: 'group', id: 'a' }, 'A')],
    }
    const first = inferSkillDescription(input, descriptions, [])!
    const character = inferSkillDescription(
      {
        ...input,
        candidates: [candidate('entity', { kind: 'character', id: 'a' }, 'A')],
      },
      descriptions,
      [],
    )!
    const translated = inferSkillDescription(
      { ...input, text: { ...input.text, ind: 'A sings' } },
      descriptions,
      [],
    )!
    expect(
      new Set([first.templateId, character.templateId, translated.templateId])
        .size,
    ).toBe(3)
  })

  it('warns with source context on ambiguity and rejects multiple confirmed templates', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const descriptions = catalog()
      const pending: PendingDescription[] = []
      const input = {
        domain: 'trigger' as const,
        type: 99,
        table: 'LiveSkillTrigger',
        key: 'group:2',
        text: localized('1 to 1'),
        candidates: [
          candidate('minimum', 1, '1'),
          candidate('maximum', 1, '1'),
        ],
      }
      expect(inferSkillDescription(input, descriptions, pending)).toBeNull()
      expect(pending).toEqual([
        expect.objectContaining({
          table: 'LiveSkillTrigger',
          key: 'group:2',
          type: 99,
          language: 'jpn',
        }),
      ])
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'LiveSkillTrigger group:2 type=99 language=jpn',
        ),
      )
      const template: DescriptionTemplate = {
        domain: 'trigger',
        type: 99,
        parameters: ['minimum', 'maximum'],
        text: localized('{minimum} to {maximum}'),
      }
      const confirmed = { trigger: { 99: [template] } }
      expect(
        inferSkillDescription(input, descriptions, [], confirmed),
      ).not.toBeNull()
      const ambiguousPending: PendingDescription[] = []
      expect(
        inferSkillDescription(input, descriptions, ambiguousPending, {
          trigger: { 99: [template, template] },
        }),
      ).toBeNull()
      expect(ambiguousPending).toEqual([
        expect.objectContaining({
          language: null,
          reason: 'Multiple confirmed templates match the parameter set',
        }),
      ])
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('language=all: Multiple confirmed templates'),
      )
    } finally {
      warn.mockRestore()
    }
  })

  it('uses confirmed templates after single-language or all-language wording edits', () => {
    const input = {
      domain: 'effect' as const,
      type: 8,
      table: 'Effect',
      key: 'one',
      text: localized('Effect gives 15%'),
      candidates: [candidate('percent', 15, '15')],
    }
    const base = localized('Boost {percent}%')
    const singleLanguage = { ...base, ind: 'Meningkatkan {percent} persen' }
    const allLanguages = Object.fromEntries(
      gameLocales.map((locale) => [locale, `Manual ${locale}: {percent}`]),
    ) as LocalizedText

    for (const text of [singleLanguage, allLanguages]) {
      const descriptions = catalog()
      const description = inferSkillDescription(input, descriptions, [], {
        effect: {
          8: [{ parameters: ['percent'], text }],
        },
      })
      expect(description).not.toBeNull()
      for (const locale of gameLocales) {
        expect(
          renderSkillDescription(
            description,
            { catalog: descriptions, targets: [] },
            locale,
          ),
        ).toBe(text[locale].replace('{percent}', '15'))
      }
    }
  })

  it('uses a confirmed template when source text cannot be inferred', () => {
    const descriptions = catalog()
    const pending: PendingDescription[] = []
    const input = {
      domain: 'effect' as const,
      type: 8,
      table: 'Effect',
      key: 'one',
      text: localized('Manual source text'),
      candidates: [candidate('percent', 15, '15')],
    }
    const template: DescriptionTemplate = {
      domain: 'effect',
      type: 8,
      parameters: ['percent'],
      text: localized('Boost {percent}%'),
    }
    const result = inferSkillDescription(input, descriptions, pending, {
      effect: { 8: [template] },
    })
    expect(result).not.toBeNull()
    expect(pending).toEqual([])
    expect(
      renderSkillDescription(
        result,
        { catalog: descriptions, targets: [] },
        'eng',
      ),
    ).toBe('Boost 15%')
  })

  it('falls back to inference when no confirmed template has the parameter set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const descriptions = catalog()
      const pending: PendingDescription[] = []
      const input = {
        domain: 'trigger' as const,
        type: 99,
        table: 'Trigger',
        key: 'one',
        text: localized('2 members'),
        candidates: [candidate('count', 2, '2')],
      }
      const template: DescriptionTemplate = {
        domain: 'trigger',
        type: 99,
        parameters: ['minimum', 'maximum'],
        text: localized('{minimum} to {maximum}'),
      }
      const result = inferSkillDescription(input, descriptions, pending, {
        trigger: { 99: [template] },
      })
      expect(result).not.toBeNull()
      expect(pending).toEqual([])
      expect(descriptions.templates[result!.templateId]!.text.eng).toBe(
        '{count} members',
      )
    } finally {
      warn.mockRestore()
    }
  })

  it('keeps a matching confirmed template pending when its placeholders are invalid', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const pending: PendingDescription[] = []
      const input = {
        domain: 'trigger' as const,
        type: 99,
        table: 'Trigger',
        key: 'one',
        text: localized('1 to 1'),
        candidates: [
          candidate('minimum', 1, '1'),
          candidate('maximum', 1, '1'),
        ],
      }
      const template: DescriptionTemplate = {
        domain: 'trigger',
        type: 99,
        parameters: ['minimum', 'maximum'],
        text: {
          ...localized('{minimum} to {maximum}'),
          ind: '{minimum} until {upper}',
        },
      }
      expect(
        inferSkillDescription(input, catalog(), pending, {
          trigger: { 99: [template] },
        }),
      ).toBeNull()
      expect(pending).toEqual([
        expect.objectContaining({
          language: 'ind',
          reason:
            'Confirmed template placeholders do not match the parameter set',
        }),
      ])
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'language=ind: Confirmed template placeholders',
        ),
      )
    } finally {
      warn.mockRestore()
    }
  })
})
