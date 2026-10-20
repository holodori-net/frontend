import type { GameLocale } from '../language.ts'
import type {
  DescriptionEntity,
  DescriptionCatalog,
  DescriptionTemplate,
  LiveLeaderSkillData,
  SkillDescription,
} from './live-skills.ts'

export interface SkillDescriptionData {
  catalog: {
    templates: Readonly<
      Record<string, Pick<DescriptionTemplate, 'parameters' | 'text'>>
    >
    labels: DescriptionCatalog['labels']
  }
  targets: readonly { id: string; description: SkillDescription | null }[]
}

export interface CostumeSkillDescriptionData extends SkillDescriptionData {
  effects: Readonly<
    Record<string, readonly { description: SkillDescription | null }[]>
  >
  triggers: Readonly<
    Record<string, readonly { description: SkillDescription | null }[]>
  >
}

const isEntityParam = (
  value: unknown,
): value is { kind: DescriptionEntity; id: string } => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { kind?: unknown; id?: unknown }
  return typeof candidate.kind === 'string' && typeof candidate.id === 'string'
}

export function renderSkillDescription(
  description: SkillDescription | null,
  data: SkillDescriptionData,
  locale: GameLocale,
): string | null {
  const render = (
    current: SkillDescription | null,
    targetStack: ReadonlySet<string>,
  ): string | null => {
    if (!current) return null

    const template = data.catalog.templates[current.templateId]
    if (!template) return null

    const values = new Map<string, string>()
    for (const name of template.parameters) {
      if (!Object.hasOwn(current.params, name)) return null
      const value = current.params[name]
      if (value === null || value === undefined) return null

      if (typeof value === 'number' || typeof value === 'string') {
        values.set(name, String(value))
        continue
      }

      if (!isEntityParam(value)) return null
      if (value.kind === 'target') {
        if (targetStack.has(value.id)) return null
        const target = data.targets.find(({ id }) => id === value.id)
        if (!target) return null
        const nested = render(
          target.description,
          new Set([...targetStack, value.id]),
        )
        if (nested === null) return null
        values.set(name, nested)
        continue
      }

      const label = data.catalog.labels[value.kind]?.[value.id]?.[locale]
      if (label === undefined || label === null) return null
      values.set(name, label)
    }

    let missingPlaceholder = false
    const text = template.text[locale].replace(
      /\{([A-Za-z][A-Za-z0-9]*)\}/g,
      (placeholder, name: string) => {
        const value = values.get(name)
        if (value === undefined) {
          missingPlaceholder = true
          return placeholder
        }
        return value
      },
    )

    return missingPlaceholder ? null : text
  }

  return render(description, new Set())
}

function joinSkillText(left: string, right: string, separator: string): string {
  const normalizedLeft = left.trim().replace(/[\s,，、;；]+$/u, '')
  const normalizedRight = right.trim().replace(/^[\s,，、;；]+/u, '')
  if (!normalizedLeft) return normalizedRight
  if (!normalizedRight) return normalizedLeft
  return `${normalizedLeft}${separator}${normalizedRight}`
}

export function composeCostumeSkillDescription(
  skill: LiveLeaderSkillData,
  data: CostumeSkillDescriptionData,
  locale: GameLocale,
  onFailure?: (reason: string) => void,
): string | null {
  const fail = (reason: string): null => {
    onFailure?.(reason)
    return null
  }

  const findSingle = <T>(
    groups: Readonly<Record<string, readonly T[]>>,
    groupId: string | null,
    required: boolean,
  ): T | null | undefined => {
    if (groupId === null) return required ? undefined : null
    const rows = groups[groupId]
    if (!rows?.length) return undefined
    if (rows.length !== 1) return undefined
    return rows[0]
  }

  const primaryEffect = findSingle(
    data.effects,
    skill.livePassiveSkillEffectGroupId,
    true,
  )
  if (!primaryEffect) return fail('主要效果必須恰有一列')
  const primaryTrigger = findSingle(
    data.triggers,
    skill.liveSkillTriggerGroupId,
    false,
  )
  if (primaryTrigger === undefined) return fail('主要條件缺少資料或不是單列')

  const additionalEffect = findSingle(
    data.effects,
    skill.additionalLivePassiveSkillEffectGroupId,
    false,
  )
  if (additionalEffect === undefined) return fail('附加效果缺少資料或不是單列')
  const additionalTrigger = findSingle(
    data.triggers,
    skill.additionalLiveSkillTriggerGroupId,
    false,
  )
  if (additionalTrigger === undefined) return fail('附加條件缺少資料或不是單列')
  if (additionalTrigger && !additionalEffect) {
    return fail('附加條件存在但沒有附加效果')
  }

  const compose = (
    trigger: { description: SkillDescription | null } | null,
    effect: { description: SkillDescription | null },
  ): string | null => {
    const effectText = renderSkillDescription(effect.description, data, locale)
    if (effectText === null) return null
    if (!trigger) return effectText

    const triggerText = renderSkillDescription(
      trigger.description,
      data,
      locale,
    )
    if (triggerText === null) return null

    const separator =
      locale === 'cht' || locale === 'chs'
        ? '，'
        : locale === 'jpn'
          ? '、'
          : ', '
    const condition =
      locale === 'ind' ? `Saat ${triggerText.trim()}` : triggerText
    return joinSkillText(condition, effectText, separator)
  }

  const main = compose(primaryTrigger, primaryEffect)
  if (main === null) return fail('主要條件或效果描述無法解析')

  const segments = [main]
  if (additionalEffect) {
    const additional = compose(additionalTrigger ?? null, additionalEffect)
    if (additional === null) return fail('附加條件或效果描述無法解析')
    segments.push(additional)
  }

  const separator =
    locale === 'jpn' || locale === 'cht' || locale === 'chs' ? '、' : '; '
  return segments.reduce(
    (text, segment) =>
      text === '' ? segment.trim() : joinSkillText(text, segment, separator),
    '',
  )
}
