export const primeVueComponents = [
  'Button',
  'Badge',
  'Accordion',
  'AccordionPanel',
  'AccordionHeader',
  'AccordionContent',
  'Checkbox',
  'Chip',
  'Dialog',
  'Divider',
  'InputText',
  'InputGroup',
  'InputGroupAddon',
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
  AccordionHeader: { directives: ['ripple'] },
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
