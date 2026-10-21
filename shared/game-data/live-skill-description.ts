import type { GameLocale } from '../language.ts'
import type {
  DescriptionEntity,
  DescriptionCatalog,
  DescriptionTemplate,
  LiveLeaderSkillData,
  SkillDescription,
} from './live-skills.ts'
import type {
  LiveActiveSkillLevelData,
  LivePassiveSkillLevelData,
  LiveSpecialSkillLevelData,
} from './card-skills.ts'

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

export interface CardSkillDescriptionData extends CostumeSkillDescriptionData {
  activeEffects: Readonly<
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
  const normalizedLeft = left.trim().replace(/[\s,，、;；.!?。！？]+$/u, '')
  const normalizedRight = right.trim().replace(/^[\s,，、;；.!?。！？]+/u, '')
  if (!normalizedLeft) return normalizedRight
  if (!normalizedRight) return normalizedLeft
  return `${normalizedLeft}${separator}${normalizedRight}`
}

function conditionSeparator(locale: GameLocale): string {
  if (locale === 'cht' || locale === 'chs') return '，'
  return locale === 'jpn' ? '、' : ', '
}

function segmentSeparator(locale: GameLocale): string {
  return locale === 'jpn' || locale === 'cht' || locale === 'chs' ? '、' : '; '
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

    const separator = conditionSeparator(locale)
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

  const separator = segmentSeparator(locale)
  return segments.reduce(
    (text, segment) =>
      text === '' ? segment.trim() : joinSkillText(text, segment, separator),
    '',
  )
}

type SkillGroupRow = { description: SkillDescription | null }

function getSingleSkillRow<T>(
  groups: Readonly<Record<string, readonly T[]>>,
  groupId: string | null,
  required: boolean,
): T | null | undefined {
  if (groupId === null) return required ? undefined : null
  const rows = groups[groupId]
  if (!rows?.length || rows.length !== 1) return undefined
  return rows[0]
}

function stripHighlight(text: string): string {
  return text.replace(/\[\/?highlight\]/gu, '').trim()
}

function renderCardSkillRow(
  row: SkillGroupRow | null | undefined,
  data: CardSkillDescriptionData,
  locale: GameLocale,
): string | null {
  if (!row) return null
  const rendered = renderSkillDescription(row.description, data, locale)
  return rendered === null ? null : stripHighlight(rendered)
}

function passiveSegment(
  triggerText: string | null,
  effectText: string,
  locale: GameLocale,
  format: 'source' | 'display',
): string {
  if (!triggerText) return effectText
  if (format === 'display') {
    const condition =
      locale === 'ind' ? `Saat ${triggerText.trim()}` : triggerText
    return joinSkillText(condition, effectText, conditionSeparator(locale))
  }
  switch (locale) {
    case 'jpn':
    case 'cht':
    case 'chs':
      return `${triggerText}${effectText}`
    case 'ind':
      return `Saat ${triggerText}, ${effectText}`
    case 'eng':
    case 'kor':
      return `${triggerText} ${effectText}`
  }
}

function failCardSkill(
  onFailure: ((reason: string) => void) | undefined,
  reason: string,
): null {
  onFailure?.(reason)
  return null
}

/** Compose a card passive skill from its structured trigger and effect rows. */
export function composePassiveSkillDescription(
  skill: LivePassiveSkillLevelData,
  data: CardSkillDescriptionData,
  locale: GameLocale,
  onFailure?: (reason: string) => void,
  format: 'source' | 'display' = 'source',
): string | null {
  const fail = (reason: string) => failCardSkill(onFailure, reason)
  if (
    skill.additionalLiveSkillTriggerGroupId !== null &&
    skill.additionalLivePassiveSkillEffectGroupId === null
  ) {
    return fail('卡片被動技能存在附加條件但沒有附加效果')
  }

  const effect = getSingleSkillRow(
    data.effects,
    skill.livePassiveSkillEffectGroupId,
    true,
  )
  if (!effect) return fail('卡片被動技能主要效果缺少資料或不是單列')
  const trigger = getSingleSkillRow(
    data.triggers,
    skill.liveSkillTriggerGroupId,
    false,
  )
  if (trigger === undefined) return fail('卡片被動技能條件缺少資料或不是單列')

  const effectText = renderCardSkillRow(effect, data, locale)
  if (effectText === null) return fail('卡片被動技能效果描述無法解析')
  const triggerText = trigger ? renderCardSkillRow(trigger, data, locale) : null
  if (trigger && triggerText === null) {
    return fail('卡片被動技能條件描述無法解析')
  }
  const segments = [passiveSegment(triggerText, effectText, locale, format)]
  if (skill.additionalLivePassiveSkillEffectGroupId !== null) {
    const additionalEffect = getSingleSkillRow(
      data.effects,
      skill.additionalLivePassiveSkillEffectGroupId,
      true,
    )
    if (!additionalEffect) {
      return fail('卡片被動技能附加效果缺少資料或不是單列')
    }
    const additionalTrigger = getSingleSkillRow(
      data.triggers,
      skill.additionalLiveSkillTriggerGroupId,
      false,
    )
    if (additionalTrigger === undefined) {
      return fail('卡片被動技能附加條件缺少資料或不是單列')
    }
    const additionalEffectText = renderCardSkillRow(
      additionalEffect,
      data,
      locale,
    )
    const additionalTriggerText = additionalTrigger
      ? renderCardSkillRow(additionalTrigger, data, locale)
      : null
    if (
      additionalEffectText === null ||
      (additionalTrigger && additionalTriggerText === null)
    ) {
      return fail('卡片被動技能附加條件或效果描述無法解析')
    }
    segments.push(
      passiveSegment(
        additionalTriggerText,
        additionalEffectText,
        locale,
        format,
      ),
    )
  }
  if (format === 'display' && segments.length > 1) {
    return joinSkillText(segments[0]!, segments[1]!, segmentSeparator(locale))
  }
  const separator = locale === 'jpn' ? '\n' : ' '
  return segments.join(separator).trim()
}

function durationSeconds(milliseconds: number | null): string | null {
  if (
    milliseconds === null ||
    !Number.isFinite(milliseconds) ||
    milliseconds < 0
  ) {
    return null
  }
  return String(milliseconds / 1000)
}

function probabilityLabel(
  skill: LiveActiveSkillLevelData,
  data: CardSkillDescriptionData,
  locale: GameLocale,
): string | null {
  const probability = skill.activationProbabilityPermilMultiply
  if (probability !== 370 && probability !== 460 && probability !== 550) {
    return null
  }
  const label =
    data.catalog.labels.probability?.[String(probability)]?.[locale] ?? null
  return label === null ? null : stripHighlight(label)
}

function activeMainSegment(
  effectText: string,
  skill: LiveActiveSkillLevelData,
  duration: string | null,
  probability: string,
  locale: GameLocale,
  format: 'source' | 'display',
): string {
  const coolTime = durationSeconds(skill.coolTimeMillisecond)!
  const chance = probability
  switch (locale) {
    case 'jpn':
      return `${coolTime}秒毎に${chance}で${duration ? `${duration}秒間` : ''}${format === 'display' ? '、' : ''}${effectText}`
    case 'eng':
      return `${duration ? `For ${duration}s, ` : ''}${format === 'display' ? joinSkillText(effectText, `Every ${coolTime}s with a ${chance} chance.`, conditionSeparator(locale)) : `${effectText} Every ${coolTime}s with a ${chance} chance.`}`
    case 'ind':
      return `${duration ? `Selama ${duration} dtk, ` : ''}${format === 'display' ? joinSkillText(effectText, `setiap ${coolTime} dtk dengan ${chance}`, conditionSeparator(locale)) : `${effectText} setiap ${coolTime} dtk dengan ${chance}`}`
    case 'kor':
      return `${coolTime}초마다 ${chance}로${duration ? '  ' : ' '}${duration ? `${duration}초 동안 ` : ''}${effectText}`
    case 'cht':
      return `每 ${coolTime} 秒以${chance}${duration ? `在 ${duration} 秒內` : ''}${format === 'display' ? '，' : ''}${effectText}`
    case 'chs':
      return `每 ${coolTime} 秒以${chance}${duration ? `在 ${duration} 秒内` : ''}${format === 'display' ? '，' : ''}${effectText}`
  }
}

function activeAdditionalSegment(
  triggerText: string | null,
  effectText: string,
  locale: GameLocale,
  format: 'source' | 'display',
): string {
  if (format === 'display') {
    if (!triggerText) return effectText
    const condition =
      locale === 'ind' ? `Saat ${triggerText.trim()}` : triggerText
    return joinSkillText(condition, effectText, conditionSeparator(locale))
  }
  switch (locale) {
    case 'jpn':
      return `${triggerText ?? ''}${effectText}`
    case 'eng':
      return `${triggerText ? `${triggerText} ` : ''}${effectText}`
    case 'ind':
      return `${triggerText ? `${triggerText} ` : ''}${effectText}`
    case 'kor':
      return `${triggerText ? `${triggerText} ` : ''}${effectText}`
    case 'cht':
    case 'chs':
      return `${triggerText ?? ''}${effectText}`
  }
}

/** Compose a card active skill with its source cooldown and probability wording. */
export function composeActiveSkillDescription(
  skill: LiveActiveSkillLevelData,
  data: CardSkillDescriptionData,
  locale: GameLocale,
  onFailure?: (reason: string) => void,
  format: 'source' | 'display' = 'source',
): string | null {
  const fail = (reason: string) => failCardSkill(onFailure, reason)
  if (skill.liveSkillTriggerGroupId !== null) {
    return fail('卡片主動技能主要條件組合尚未確認')
  }
  if (
    (skill.additionalLiveSkillTriggerGroupId === null) !==
    (skill.additionalLiveActiveSkillEffectGroupId === null)
  ) {
    return fail('卡片主動技能附加條件與效果組合不完整')
  }
  if (skill.limitCount !== null) {
    return fail('卡片主動技能使用次數限制組合尚未確認')
  }

  const effect = getSingleSkillRow(
    data.activeEffects,
    skill.liveActiveSkillEffectGroupId,
    true,
  )
  if (!effect) return fail('卡片主動技能主要效果缺少資料或不是單列')
  const duration =
    skill.effectDurationMillisecond === null
      ? null
      : durationSeconds(skill.effectDurationMillisecond)
  if (skill.effectDurationMillisecond !== null && duration === null) {
    return fail('卡片主動技能效果時間無法解析')
  }
  const coolTime = durationSeconds(skill.coolTimeMillisecond)
  if (coolTime === null) return fail('卡片主動技能冷卻時間無法解析')
  const probability = probabilityLabel(skill, data, locale)
  if (probability === null) return fail('卡片主動技能發動機率尚未確認')
  const effectText = renderCardSkillRow(effect, data, locale)
  if (effectText === null) return fail('卡片主動技能效果描述無法解析')
  const main = activeMainSegment(
    effectText,
    skill,
    duration,
    probability,
    locale,
    format,
  )

  if (skill.additionalLiveActiveSkillEffectGroupId === null) return main.trim()
  const additionalEffect = getSingleSkillRow(
    data.activeEffects,
    skill.additionalLiveActiveSkillEffectGroupId,
    true,
  )
  if (!additionalEffect) return fail('卡片主動技能附加效果缺少資料或不是單列')
  const additionalTrigger = getSingleSkillRow(
    data.triggers,
    skill.additionalLiveSkillTriggerGroupId,
    true,
  )
  if (!additionalTrigger) return fail('卡片主動技能附加條件缺少資料或不是單列')
  const additionalEffectText = renderCardSkillRow(
    additionalEffect,
    data,
    locale,
  )
  const additionalTriggerText = renderCardSkillRow(
    additionalTrigger,
    data,
    locale,
  )
  if (additionalEffectText === null || additionalTriggerText === null) {
    return fail('卡片主動技能附加條件或效果描述無法解析')
  }
  const additional = activeAdditionalSegment(
    additionalTriggerText,
    additionalEffectText,
    locale,
    format,
  )
  if (format === 'display') {
    return joinSkillText(main, additional, segmentSeparator(locale))
  }
  return `${main}${locale === 'jpn' ? '\n' : ' '}${additional}`.trim()
}

function specialMainSegment(
  effectText: string,
  duration: string,
  locale: GameLocale,
  format: 'source' | 'display',
): string {
  switch (locale) {
    case 'jpn':
      return `${duration}秒間${format === 'display' ? '、' : ''}${effectText}`
    case 'eng':
      return `For ${duration}s, ${effectText}`
    case 'ind':
      return `Selama ${duration} dtk, ${effectText}`
    case 'kor':
      return `${duration}초 동안 ${effectText}`
    case 'cht':
      return `在 ${duration} 秒內${format === 'display' ? '，' : ''}${effectText}`
    case 'chs':
      return `在 ${duration} 秒内${format === 'display' ? '，' : ''}${effectText}`
  }
}

function specialAdditionalSegment(
  triggerText: string | null,
  effectText: string,
  locale: GameLocale,
  format: 'source' | 'display',
): string {
  if (format === 'display') {
    if (!triggerText) return effectText
    const condition =
      locale === 'ind'
        ? `saat ${triggerText.trim()}`
        : locale === 'cht' || locale === 'chs'
          ? `且${triggerText}`
          : triggerText
    return joinSkillText(condition, effectText, conditionSeparator(locale))
  }
  switch (locale) {
    case 'jpn':
      return `${triggerText ?? ''}${effectText}`
    case 'eng':
    case 'kor':
      return `${triggerText ? `${triggerText} ` : ''}${effectText}`
    case 'ind':
      return triggerText ? `saat ${triggerText} ${effectText}` : effectText
    case 'cht':
    case 'chs':
      return `${triggerText ? `且${triggerText}` : ''}${effectText}`
  }
}

/** Compose a card special skill from its duration, main effect, and optional effect. */
export function composeSpecialSkillDescription(
  skill: LiveSpecialSkillLevelData,
  data: CardSkillDescriptionData,
  locale: GameLocale,
  onFailure?: (reason: string) => void,
  format: 'source' | 'display' = 'source',
): string | null {
  const fail = (reason: string) => failCardSkill(onFailure, reason)
  if (
    skill.additionalLiveSkillTriggerGroupId !== null &&
    skill.additionalLiveActiveSkillEffectGroupId === null
  ) {
    return fail('卡片特殊技能附加條件與效果組合不完整')
  }
  const effect = getSingleSkillRow(
    data.activeEffects,
    skill.liveActiveSkillEffectGroupId,
    true,
  )
  if (!effect) return fail('卡片特殊技能主要效果缺少資料或不是單列')
  const duration = durationSeconds(skill.effectDurationMillisecond)
  if (duration === null) return fail('卡片特殊技能效果時間無法解析')
  const effectText = renderCardSkillRow(effect, data, locale)
  if (effectText === null) return fail('卡片特殊技能效果描述無法解析')
  const main = specialMainSegment(effectText, duration, locale, format)

  if (skill.additionalLiveActiveSkillEffectGroupId === null) {
    return main.trim()
  }
  const additionalEffect = getSingleSkillRow(
    data.activeEffects,
    skill.additionalLiveActiveSkillEffectGroupId,
    true,
  )
  if (!additionalEffect) return fail('卡片特殊技能附加效果缺少資料或不是單列')
  const additionalTrigger = getSingleSkillRow(
    data.triggers,
    skill.additionalLiveSkillTriggerGroupId,
    false,
  )
  if (additionalTrigger === undefined) {
    return fail('卡片特殊技能附加條件缺少資料或不是單列')
  }
  const additionalEffectText = renderCardSkillRow(
    additionalEffect,
    data,
    locale,
  )
  const additionalTriggerText = additionalTrigger
    ? renderCardSkillRow(additionalTrigger, data, locale)
    : null
  if (
    additionalEffectText === null ||
    (additionalTrigger && additionalTriggerText === null)
  ) {
    return fail('卡片特殊技能附加條件或效果描述無法解析')
  }
  const additional = specialAdditionalSegment(
    additionalTriggerText,
    additionalEffectText,
    locale,
    format,
  )
  if (format === 'display') {
    return joinSkillText(main, additional, segmentSeparator(locale))
  }
  const separator =
    locale === 'jpn' ? '\n' : locale === 'cht' || locale === 'chs' ? '' : ' '
  return `${main}${separator}${additional}`.trim()
}
