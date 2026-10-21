import { gameLocales, type GameLocale } from '../language.ts'
import type { CardListPayload } from './card-list-data.ts'
import type { SkillDescription } from './live-skills.ts'
import type { SkillDescriptionData } from './live-skill-description.ts'
import {
  composeActiveSkillDescription,
  composeCostumeSkillDescription,
  composePassiveSkillDescription,
  composeSpecialSkillDescription,
} from './live-skill-description.ts'

export type CardSkillKind = 'passive' | 'active' | 'special' | 'leader'
export type CardSkillEffect =
  | 'performance'
  | 'technique'
  | 'sense'
  | 'allStats'
  | 'scoreUp'
  | 'scoreSupport'
  | 'activationRate'
  | 'lifeRecovery'
  | 'judgement'
export type CardSkillGroupVariant =
  'all' | 'conditional' | 'pure' | 'additional'

export interface CardSkillFilterOption {
  key: string
  kind: CardSkillKind
  sourceKeys: string[]
  descriptions: Record<GameLocale, string>
  effects: CardSkillEffect[]
  conditionalEffects: CardSkillEffect[]
  pureEffects: CardSkillEffect[]
}
export interface CardSkillFilterCatalog {
  options: CardSkillFilterOption[]
  canonicalKeys: Record<string, string>
  cardSkills: Record<string, string[]>
}

const passiveTypes: Record<number, CardSkillEffect> = {
  4: 'performance',
  5: 'technique',
  6: 'sense',
  8: 'allStats',
  10: 'scoreSupport',
}
const activeTypes: Record<number, CardSkillEffect> = {
  1: 'scoreUp',
  5: 'scoreSupport',
  6: 'activationRate',
  8: 'lifeRecovery',
  9: 'judgement',
}
const locales = gameLocales
type Segment = {
  effect: CardSkillEffect | null
  conditional: boolean
  signature: unknown
}
type Source = {
  key: string
  kind: CardSkillKind
  signature: string
  segments: Segment[]
  descriptions: Record<GameLocale, string>
}

const stable = (value: unknown): string => JSON.stringify(value)
const sortUnique = <T extends string>(values: T[]) =>
  [...new Set(values)].sort() as T[]

export function buildCardSkillFilterCatalog(
  payload: CardListPayload,
): CardSkillFilterCatalog {
  const sources: Source[] = []
  const groupSignature = (
    groupId: string | null,
    groups: Record<
      string,
      readonly { type?: number; description: SkillDescription | null }[]
    >,
    unresolvedKey: string,
  ): {
    signature: unknown
    rows: readonly { type?: number; description: SkillDescription | null }[]
    resolved: boolean
  } => {
    if (!groupId) return { signature: null, rows: [], resolved: true }
    const rows = groups[groupId]
    if (!rows?.length)
      return {
        signature: ['missing', unresolvedKey],
        rows: [],
        resolved: false,
      }
    let resolved = true
    const descriptions = rows.map((row) => {
      const normalized = normalizeDescription(row.description, payload)
      if (normalized === null) resolved = false
      return [row.type ?? null, normalized]
    })
    return {
      signature: resolved
        ? descriptions
        : ['unresolved', unresolvedKey, groupId, descriptions],
      rows,
      resolved,
    }
  }
  const triggerSignature = (id: string | null, key: string) =>
    groupSignature(id, payload.skills.triggers, key)
  const passiveEffect = (
    id: string | null,
    triggerId: string | null,
    key: string,
  ): Segment[] => {
    if (id === null) return []
    const effect = groupSignature(id, payload.skills.effects, key)
    const trigger = triggerSignature(triggerId, `${key}:trigger`)
    if (!effect.rows.length) {
      return [
        {
          effect: null,
          conditional: triggerId !== null,
          signature: ['missing-effect', effect.signature, trigger.signature],
        },
      ]
    }
    return effect.rows.map((row, i) => ({
      effect: row.type === undefined ? null : (passiveTypes[row.type] ?? null),
      conditional: triggerId !== null,
      signature: [effect.signature, i, trigger.signature],
    }))
  }
  const activeEffect = (
    id: string | null,
    triggerId: string | null,
    key: string,
  ): Segment[] => {
    if (id === null) return []
    const effect = groupSignature(id, payload.skills.activeEffects, key)
    const trigger = triggerSignature(triggerId, `${key}:trigger`)
    if (!effect.rows.length) {
      return [
        {
          effect: null,
          conditional: triggerId !== null,
          signature: ['missing-effect', effect.signature, trigger.signature],
        },
      ]
    }
    return effect.rows.map((row, i) => ({
      effect: row.type === undefined ? null : (activeTypes[row.type] ?? null),
      conditional: triggerId !== null,
      signature: [effect.signature, i, trigger.signature],
    }))
  }
  const add = <T extends object>(
    key: string,
    kind: CardSkillKind,
    levels: readonly T[],
    getSegments: (level: T, key: string) => Segment[],
    render: (
      level: T,
      locale: GameLocale,
      data: CardListPayload['skills'] &
        Pick<SkillDescriptionData, 'formatSummaryValue'>,
    ) => string | null,
  ) => {
    const levelNumber = (level: T) =>
      'level' in level && typeof level.level === 'number' ? level.level : 1
    const ordered = [...levels].sort((a, b) => levelNumber(a) - levelNumber(b))
    const segmentsByLevel = ordered.map((level) => getSegments(level, key))
    const signature = stable(
      ordered.map((level, index) => [
        ...Object.entries(level)
          .filter(
            ([name]) =>
              name !== 'id' &&
              !name.endsWith('Id') &&
              !name.endsWith('GroupId'),
          )
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        segmentsByLevel[index]!.map((s) => s.signature),
      ]),
    )
    const descriptions = Object.fromEntries(
      locales.map((locale) => [
        locale,
        mergeSkillLevelDescriptions(
          ordered.map((level) => {
            const capture = createSummaryFormatter()
            return {
              level: levelNumber(level),
              description: render(level, locale, {
                ...payload.skills,
                formatSummaryValue: capture.format,
              }),
              fields: capture.fields,
              values: capture.values,
            }
          }),
        ),
      ]),
    ) as Record<GameLocale, string>
    sources.push({
      key,
      kind,
      signature,
      segments: segmentsByLevel.flat(),
      descriptions,
    })
  }
  for (const [id, levels] of Object.entries(payload.skills.passiveSkills))
    add(
      `passive:${id}`,
      'passive',
      levels,
      (l, key) => [
        ...passiveEffect(
          l.livePassiveSkillEffectGroupId,
          l.liveSkillTriggerGroupId,
          key,
        ),
        ...passiveEffect(
          l.additionalLivePassiveSkillEffectGroupId,
          l.additionalLiveSkillTriggerGroupId,
          `${key}:additional`,
        ),
      ],
      (l, locale, data) =>
        composePassiveSkillDescription(l, data, locale, undefined, 'display'),
    )
  for (const [id, levels] of Object.entries(payload.skills.activeSkills))
    add(
      `active:${id}`,
      'active',
      levels,
      (l, key) => [
        ...activeEffect(
          l.liveActiveSkillEffectGroupId,
          l.liveSkillTriggerGroupId,
          key,
        ),
        ...activeEffect(
          l.additionalLiveActiveSkillEffectGroupId,
          l.additionalLiveSkillTriggerGroupId,
          `${key}:additional`,
        ),
      ],
      (l, locale, data) =>
        composeActiveSkillDescription(l, data, locale, undefined, 'display'),
    )
  for (const [id, levels] of Object.entries(payload.skills.specialSkills))
    add(
      `special:${id}`,
      'special',
      levels,
      (l, key) => [
        ...activeEffect(l.liveActiveSkillEffectGroupId, null, key),
        ...activeEffect(
          l.additionalLiveActiveSkillEffectGroupId,
          l.additionalLiveSkillTriggerGroupId,
          `${key}:additional`,
        ),
      ],
      (l, locale, data) =>
        composeSpecialSkillDescription(l, data, locale, undefined, 'display'),
    )
  for (const [id, skill] of Object.entries(payload.skills.leaderSkills))
    add(
      `leader:${id}`,
      'leader',
      [skill],
      (l, key) => [
        ...passiveEffect(
          l.livePassiveSkillEffectGroupId,
          l.liveSkillTriggerGroupId,
          key,
        ),
        ...passiveEffect(
          l.additionalLivePassiveSkillEffectGroupId,
          l.additionalLiveSkillTriggerGroupId,
          `${key}:additional`,
        ),
      ],
      (l, locale, data) => composeCostumeSkillDescription(l, data, locale),
    )

  const bundles = new Map<string, Source[]>()
  for (const source of sources) {
    const key = `${source.kind}:${source.signature}`
    const bundle = bundles.get(key) ?? []
    bundle.push(source)
    bundles.set(key, bundle)
  }
  const canonicalKeys: Record<string, string> = {}
  const options: CardSkillFilterOption[] = []
  const keyMap = new Map<string, string>()
  for (const bundle of bundles.values()) {
    bundle.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    const key = bundle[0]!.key
    const sourceKeys = bundle.map(({ key }) => key)
    sourceKeys.forEach((sourceKey) => {
      canonicalKeys[sourceKey] = key
      keyMap.set(sourceKey, key)
    })
    const segments = bundle[0]!.segments
    const effects = sortUnique(
      segments.flatMap((s) => (s.effect ? [s.effect] : [])),
    )
    const conditionalEffects = sortUnique(
      segments.flatMap((s) => (s.conditional && s.effect ? [s.effect] : [])),
    )
    const allKinds = new Set(
      segments.flatMap((s) => (s.effect ? [s.effect] : [])),
    )
    const pureEffects =
      allKinds.size === 1 &&
      segments.every((s) => !s.conditional && s.effect !== null)
        ? [...allKinds]
        : []
    options.push({
      key,
      kind: bundle[0]!.kind,
      sourceKeys,
      descriptions: bundle[0]!.descriptions,
      effects,
      conditionalEffects,
      pureEffects,
    })
  }
  options.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  const cardSkills: Record<string, string[]> = {}
  for (const card of payload.cards) {
    const keys = [
      `passive:${card.livePassiveSkillId}`,
      `active:${card.liveActiveSkillId}`,
      `special:${card.liveSpecialSkillId}`,
    ]
    const costume = payload.costumes[card.costumeId ?? '']
    if (costume?.leaderSkillId) keys.push(`leader:${costume.leaderSkillId}`)
    cardSkills[card.id] = [
      ...new Set(
        keys
          .map((source) => keyMap.get(source))
          .filter((key): key is string => !!key),
      ),
    ]
  }
  return { options, canonicalKeys, cardSkills }
}

function normalizeDescription(
  description: SkillDescription | null,
  payload: CardListPayload,
  stack = new Set<string>(),
): unknown | null {
  if (!description) return null
  const template = payload.skills.catalog.templates[description.templateId]
  if (!template) return null
  const params: [string, unknown][] = []
  for (const name of template.parameters) {
    const value = description.params[name]
    if (value === undefined || value === null) return null
    if (typeof value !== 'object') {
      params.push([name, value])
      continue
    }
    if (value.kind === 'target') {
      if (stack.has(value.id)) return null
      const target = payload.skills.targets.find(({ id }) => id === value.id)
      if (!target) return null
      const nested = normalizeDescription(
        target.description,
        payload,
        new Set([...stack, value.id]),
      )
      if (nested === null) return null
      params.push([name, nested])
      continue
    }
    const label = payload.skills.catalog.labels[value.kind]?.[value.id]
    if (!label) return null
    params.push([name, { kind: value.kind, id: value.id }])
  }
  return [description.templateId, Object.fromEntries(params)]
}

function createSummaryFormatter(): {
  format: NonNullable<SkillDescriptionData['formatSummaryValue']>
  fields: string[]
  values: string[]
} {
  const fields: string[] = []
  const values: string[] = []
  return {
    fields,
    values,
    format(field, value) {
      if (
        field !== 'probabilityLabel' &&
        field !== 'coolTime' &&
        field !== 'effectDuration' &&
        !Number.isFinite(Number(value))
      )
        return undefined
      const index = fields.length
      fields.push(field)
      values.push(value)
      return `\uE000${index}:${field}\uE001`
    },
  }
}

export function mergeStructuredSkillValues(values: readonly string[]): string {
  return values.every((item) => item === values[0])
    ? (values[0] ?? '')
    : values.join('/')
}

export function mergeSkillLevelDescriptions(
  levels: readonly {
    level: number
    description: string | null
    fields?: readonly string[]
    values?: readonly string[]
  }[],
): string {
  if (!levels.length || levels.some(({ description }) => description === null))
    return ''
  const texts = levels.map(({ description }) => description!)
  const firstFields = levels[0]!.fields ?? []
  const sameShape = levels.every(
    ({ description, fields }) =>
      description === texts[0] &&
      (fields ?? []).length === firstFields.length &&
      (fields ?? []).every((field, index) => field === firstFields[index]),
  )
  if (sameShape) {
    let result = texts[0]!
    firstFields.forEach((field, index) => {
      const token = `\uE000${index}:${field}\uE001`
      const values = levels.map(({ values }) => values?.[index] ?? '')
      result = result.replaceAll(token, mergeStructuredSkillValues(values))
    })
    return result
  }
  return levels
    .map(({ level, description, fields, values }) => {
      let complete = description!
      ;(fields ?? []).forEach((field, index) => {
        complete = complete.replaceAll(
          `\uE000${index}:${field}\uE001`,
          values?.[index] ?? '',
        )
      })
      return `Lv. ${level}: ${complete}`
    })
    .join(' / ')
}
