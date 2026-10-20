import { describe, expect, it } from 'vitest'
import { tokenizeSkillText } from '../shared/game-data/skill-text.ts'

describe('tokenizeSkillText', () => {
  it('parses inline and adjacent attribute tags', () => {
    expect(
      tokenizeSkillText(
        'A[attribute=cute]cute[/attribute][attribute=pure]純[/attribute]B',
      ),
    ).toEqual([
      { type: 'text', value: 'A' },
      { type: 'attribute', attribute: 'cute', value: 'cute' },
      { type: 'attribute', attribute: 'pure', value: '純' },
      { type: 'text', value: 'B' },
    ])
  })

  it('preserves multilingual text and newlines around tags', () => {
    expect(
      tokenizeSkillText('追加効果\n[attribute=happy]快樂[/attribute]提升'),
    ).toEqual([
      { type: 'text', value: '追加効果\n' },
      { type: 'attribute', attribute: 'happy', value: '快樂' },
      { type: 'text', value: '提升' },
    ])
  })

  it('keeps unknown, malformed, and HTML source as literal text', () => {
    const text =
      '[attribute=unknown]x[/attribute][attribute=cute]x<b>safe</b><attribute=cute>x</attribute>'
    expect(tokenizeSkillText(text)).toEqual([{ type: 'text', value: text }])
  })

  it('preserves malformed source before a later supported tag', () => {
    expect(
      tokenizeSkillText(
        '[attribute=unknown]x[/attribute]![attribute=pure]純[/attribute]',
      ),
    ).toEqual([
      { type: 'text', value: '[attribute=unknown]x[/attribute]!' },
      { type: 'attribute', attribute: 'pure', value: '純' },
    ])
  })
})
