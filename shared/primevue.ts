export const primeVueComponents = [
  'Button',
  'Checkbox',
  'Chip',
  'Dialog',
  'InputText',
  'Message',
  'MultiSelect',
  'Popover',
  'Select',
  'Skeleton',
  'Tag',
  'ToggleSwitch',
] as const

export const primeVueStyleDependencies: Partial<
  Record<
    (typeof primeVueComponents)[number],
    { components?: readonly string[]; directives?: readonly string[] }
  >
> = {
  Button: { components: ['Badge'], directives: ['ripple'] },
  Dialog: { directives: ['ripple'] },
  Message: { directives: ['ripple'] },
  MultiSelect: {
    components: ['Chip', 'IconField', 'VirtualScroller'],
    directives: ['ripple'],
  },
  Popover: { directives: ['ripple'] },
  Select: {
    components: ['IconField', 'VirtualScroller'],
    directives: ['ripple'],
  },
} as const
