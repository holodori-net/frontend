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
  'InputIcon',
  'Message',
  'MultiSelect',
  'Popover',
  'Select',
  'Skeleton',
  'Tag',
  'Tab',
  'TabList',
  'Tabs',
  'Tree',
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
  Tab: { directives: ['ripple'] },
  TabList: { directives: ['ripple'] },
  Tree: {
    components: ['Checkbox', 'Button', 'IconField', 'InputIcon'],
    directives: ['ripple'],
  },
} as const
