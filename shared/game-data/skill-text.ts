export type SkillTextPart =
  | { type: 'text'; value: string }
  | { type: 'attribute'; attribute: 'cute' | 'pure' | 'happy'; value: string }

const openingTag = /^\[attribute=(cute|pure|happy)\]/

/** Splits supported attribute tags into renderable parts while retaining all other source as text. */
export function tokenizeSkillText(text: string): SkillTextPart[] {
  const parts: SkillTextPart[] = []
  let cursor = 0
  let textStart = 0

  while (cursor < text.length) {
    const openIndex = text.indexOf('[attribute=', cursor)
    if (openIndex < 0) break

    const opening = openingTag.exec(text.slice(openIndex))
    if (!opening) {
      cursor = openIndex + 1
      continue
    }

    const attribute = opening[1] as 'cute' | 'pure' | 'happy'
    const contentStart = openIndex + opening[0].length
    const closing = '[/attribute]'
    const closeIndex = text.indexOf(closing, contentStart)
    if (closeIndex < 0) {
      cursor = openIndex + 1
      continue
    }

    if (openIndex > textStart)
      parts.push({ type: 'text', value: text.slice(textStart, openIndex) })
    parts.push({
      type: 'attribute',
      attribute,
      value: text.slice(contentStart, closeIndex),
    })
    cursor = closeIndex + closing.length
    textStart = cursor
  }

  if (textStart < text.length)
    parts.push({ type: 'text', value: text.slice(textStart) })
  return parts.length ? parts : [{ type: 'text', value: text }]
}
