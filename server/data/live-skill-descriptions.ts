import { createHash } from 'node:crypto'
import { gameLocales } from '#shared/language'
import type { LocalizedText } from '#shared/game-data/localized-text'
import type {
  ConfirmedDescriptionTemplates,
  DescriptionCatalog,
  DescriptionDomain,
  DescriptionParam,
  DescriptionTemplate,
  PendingDescription,
  SkillDescription,
} from '#shared/game-data/live-skills'
import { confirmedDescriptionTemplates } from './live-skill-description-templates.ts'

export interface DescriptionCandidate {
  name: string
  value: DescriptionParam
  text: LocalizedText
}

interface DescriptionInput {
  domain: DescriptionDomain
  type: number
  table: string
  key: string
  text: LocalizedText
  candidates: DescriptionCandidate[]
}

export function reportPendingDescription(
  pending: PendingDescription[],
  item: PendingDescription,
) {
  pending.push(item)
  console.warn(
    `[live-skill] ${item.table} ${item.key} type=${item.type} language=${item.language ?? 'all'}: ${item.reason}`,
  )
}

function parameterNames(text: string): string[] {
  return [...text.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map(
    (match) => match[1]!,
  )
}

function stripSourceMarkers(text: LocalizedText): LocalizedText {
  return Object.fromEntries(
    gameLocales.map((locale) => [
      locale,
      text[locale].replace(/\[\/?highlight\]/g, ''),
    ]),
  ) as LocalizedText
}

function restore(
  text: string,
  candidates: DescriptionCandidate[],
  locale: keyof LocalizedText,
): string {
  return text.replace(
    /\{([A-Za-z][A-Za-z0-9]*)\}/g,
    (match, name: string) =>
      candidates.find((candidate) => candidate.name === name)?.text[locale] ??
      match,
  )
}

function appliesTo(
  template: DescriptionTemplate,
  input: DescriptionInput,
): boolean {
  const expected = input.candidates.map(({ name }) => name).sort()
  return (
    template.domain === input.domain &&
    template.type === input.type &&
    JSON.stringify([...template.parameters].sort()) === JSON.stringify(expected)
  )
}

function invalidPlaceholderLocale(
  template: DescriptionTemplate,
  input: DescriptionInput,
): keyof LocalizedText | null {
  const expected = input.candidates.map(({ name }) => name).sort()
  return (
    gameLocales.find((locale) => {
      const names = [...new Set(parameterNames(template.text[locale]))].sort()
      return JSON.stringify(names) !== JSON.stringify(expected)
    }) ?? null
  )
}

interface ParameterSpan {
  start: number
  end: number
  name: string
}

function overlaps(start: number, end: number, spans: ParameterSpan[]): boolean {
  return spans.some((span) => start < span.end && end > span.start)
}

function inferText(
  source: string,
  candidates: DescriptionCandidate[],
  locale: keyof LocalizedText,
): string {
  const spans: ParameterSpan[] = []
  const entities = candidates.filter(({ value }) => typeof value === 'object')
  const numbers = candidates.filter(({ value }) => typeof value !== 'object')
  for (const candidate of [...entities, ...numbers]) {
    const value = candidate.text[locale]
    if (!value) throw new Error(`Empty parameter ${candidate.name}`)
    const occurrences: ParameterSpan[] = []
    if (typeof candidate.value === 'object') {
      let start = source.indexOf(value)
      while (start !== -1) {
        const end = start + value.length
        if (!overlaps(start, end, spans))
          occurrences.push({ start, end, name: candidate.name })
        start = source.indexOf(value, start + 1)
      }
    } else {
      for (const match of source.matchAll(
        /[-+]?(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?/g,
      )) {
        const start = match.index
        const end = start + match[0].length
        if (match[0] === value && !overlaps(start, end, spans)) {
          occurrences.push({ start, end, name: candidate.name })
        }
      }
    }
    if (occurrences.length !== 1) {
      throw new Error(
        `Parameter ${candidate.name} has ${occurrences.length} unambiguous positions`,
      )
    }
    spans.push(occurrences[0]!)
  }
  let template = source
  for (const span of spans.sort((a, b) => b.start - a.start)) {
    template =
      template.slice(0, span.start) +
      `{${span.name}}` +
      template.slice(span.end)
  }
  return template
}

function addTemplate(
  template: DescriptionTemplate,
  input: DescriptionInput,
  catalog: DescriptionCatalog,
): SkillDescription {
  template = { ...template, text: stripSourceMarkers(template.text) }
  const semantics = input.candidates
    .map(({ name, value }) => [
      name,
      typeof value === 'object' ? value.kind : typeof value,
    ])
    .sort(([a], [b]) => a!.localeCompare(b!))
  const fingerprint = JSON.stringify([
    input.domain,
    input.type,
    semantics,
    gameLocales.map((locale) => template.text[locale]),
  ])
  const digest = createHash('sha256')
    .update(fingerprint)
    .digest('hex')
    .slice(0, 24)
  const templateId = `${input.domain}:${input.type}:${digest}`
  catalog.templates[templateId] = template
  return {
    templateId,
    params: Object.fromEntries(
      input.candidates.map(({ name, value }) => [name, value]),
    ),
  }
}

export function inferSkillDescription(
  input: DescriptionInput,
  catalog: DescriptionCatalog,
  pending: PendingDescription[],
  confirmed: ConfirmedDescriptionTemplates = confirmedDescriptionTemplates,
): SkillDescription | null {
  input = { ...input, text: stripSourceMarkers(input.text) }
  if (
    new Set(input.candidates.map(({ name }) => name)).size !==
    input.candidates.length
  ) {
    reportPendingDescription(pending, {
      table: input.table,
      key: input.key,
      type: input.type,
      language: null,
      reason: 'Parameter names are not unique',
    })
    return null
  }
  const matching = (confirmed[input.domain]?.[input.type] ?? [])
    .map((template) => ({
      ...template,
      domain: input.domain,
      type: input.type,
    }))
    .filter((template) => appliesTo(template, input))
  if (matching.length > 1) {
    reportPendingDescription(pending, {
      table: input.table,
      key: input.key,
      type: input.type,
      language: null,
      reason: 'Multiple confirmed templates match the parameter set',
    })
    return null
  }
  if (matching.length === 1) {
    const template = matching[0]!
    const invalidLocale = invalidPlaceholderLocale(template, input)
    if (invalidLocale) {
      reportPendingDescription(pending, {
        table: input.table,
        key: input.key,
        type: input.type,
        language: invalidLocale,
        reason:
          'Confirmed template placeholders do not match the parameter set',
      })
      return null
    }
    return addTemplate(template, input, catalog)
  }

  const text = {} as LocalizedText
  const parameters = input.candidates.map(({ name }) => name)
  for (const locale of gameLocales) {
    try {
      text[locale] = inferText(input.text[locale], input.candidates, locale)
      if (
        JSON.stringify([...new Set(parameterNames(text[locale]))].sort()) !==
          JSON.stringify([...parameters].sort()) ||
        restore(text[locale], input.candidates, locale) !== input.text[locale]
      )
        throw new Error('Template does not restore the source text')
    } catch (cause) {
      reportPendingDescription(pending, {
        table: input.table,
        key: input.key,
        type: input.type,
        language: locale,
        reason: cause instanceof Error ? cause.message : String(cause),
      })
      return null
    }
  }
  return addTemplate(
    {
      domain: input.domain,
      type: input.type,
      parameters,
      text,
    },
    input,
    catalog,
  )
}
