import { describe, expect, it } from 'vitest'
import {
  generatePrimeVueStyles,
  extractPrimeVueStyleSheets,
} from '../scripts/styles/primevue.ts'
import theme from '../app/themes/primevue.ts'
import { primeVueComponents } from '../shared/primevue.ts'

describe('PrimeVue shared styles', () => {
  it('generates styles for every allowlisted component in module order', async () => {
    const result = await generatePrimeVueStyles(theme)

    expect(result.styleIds).toEqual(
      expect.arrayContaining(
        primeVueComponents.map(
          (component) => `${component.toLowerCase()}-style`,
        ),
      ),
    )
    expect(new Set(result.styleIds).size).toBe(result.styleIds.length)
    expect(result.styleIds.indexOf('checkbox-style')).toBeLessThan(
      result.styleIds.indexOf('button-style'),
    )
    expect(result.styleIds.indexOf('select-style')).toBeLessThan(
      result.styleIds.indexOf('dialog-style'),
    )
  })

  it('includes styles imported by component templates after registered styles', async () => {
    const { styleIds } = await generatePrimeVueStyles(theme)
    const dependencyStyles = [
      'virtualscroller',
      'virtualscroller-variables',
      'virtualscroller-style',
      'ripple-directive-variables',
      'ripple-directive-style',
      'badge-variables',
      'badge-style',
      'iconfield-style',
      'chip-style',
    ]

    expect(styleIds).toEqual(expect.arrayContaining(dependencyStyles))
    expect(styleIds.indexOf('tag-style')).toBeLessThan(
      styleIds.indexOf('virtualscroller'),
    )
  })

  it('rejects output that is not a PrimeVue style wrapper', () => {
    expect(() =>
      extractPrimeVueStyleSheets(
        '<style>.p-button { color: red; }</style>',
        'test',
      ),
    ).toThrow(/Unexpected PrimeVue style output/)
  })

  it('preserves PrimeVue CSS variable references', async () => {
    const { css } = await generatePrimeVueStyles(theme)

    expect(css).toContain('var(--p-button-primary-background)')
    expect(css).toContain('var(--p-primary-color)')
    expect(css).toContain('var(--p-virtualscroller-loader-mask-background)')
    expect(css).toContain('var(--p-ripple-background)')
    expect(css).toContain('var(--p-badge-primary-background)')
    expect(css).toContain('var(--p-iconfield-icon-color)')
  })
})
