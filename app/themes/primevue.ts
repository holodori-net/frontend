import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'
import { primaryShades, surfaceShades } from './member-palettes.ts'

const primary = {
  color: 'var(--member-primary-color)',
  contrastColor: 'var(--member-primary-contrast-color)',
  hoverColor: 'var(--member-primary-hover-color)',
  activeColor: 'var(--member-primary-active-color)',
}
const surface = Object.fromEntries(
  surfaceShades.map((shade) => [shade, `var(--member-surface-${shade})`]),
)

export default {
  preset: definePreset(Aura, {
    semantic: {
      primary: Object.fromEntries(
        primaryShades.map((shade) => [shade, `var(--member-primary-${shade})`]),
      ),
      colorScheme: {
        light: {
          primary,
          surface,
          text: {
            color: '{surface.800}',
            hoverColor: '{surface.900}',
            mutedColor: '{surface.700}',
            hoverMutedColor: '{surface.800}',
          },
        },
        dark: {
          primary,
          surface,
          text: {
            color: '{surface.0}',
            hoverColor: '{surface.50}',
            mutedColor: '{surface.200}',
            hoverMutedColor: '{surface.100}',
          },
        },
      },
    },
  }),
  options: {
    prefix: 'p',
    darkModeSelector: '.dark',
    cssLayer: {
      name: 'primevue',
      order: 'theme, base, primevue, components, utilities',
    },
  },
}
