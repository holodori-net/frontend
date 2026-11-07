export interface CardSkillTreeNode {
  key: string
  label?: string
  searchText?: string
  canonicalKey?: string
  children?: readonly CardSkillTreeNode[]
}

export interface CardSkillTreeSelectionState {
  checked?: boolean
  partialChecked?: boolean
}

export type CardSkillTreeSelectionKeys = Record<
  string,
  CardSkillTreeSelectionState
>

export interface CardSkillEffectOption {
  key: string
  effects: readonly string[]
  conditionalEffects: readonly string[]
  pureEffects: readonly string[]
}

export interface CardSkillEffectVariant {
  key: 'all' | 'conditional' | 'pure' | 'additional'
  label: string
}

export function buildCardSkillEffectTree<T extends CardSkillEffectOption>(
  options: readonly T[],
  effects: readonly string[],
  variants: readonly CardSkillEffectVariant[],
  effectLabels: Readonly<Record<string, string>>,
  makeLeaf: (option: T, key: string) => CardSkillTreeNode,
): CardSkillTreeNode[] {
  const hasEffect = (
    option: T,
    effect: string,
    variant: CardSkillEffectVariant['key'],
  ) => {
    if (variant === 'conditional')
      return option.conditionalEffects.includes(effect)
    if (variant === 'pure') return option.pureEffects.includes(effect)
    if (variant === 'additional')
      return option.effects.includes(effect) && new Set(option.effects).size > 1
    return option.effects.includes(effect)
  }

  return effects.flatMap((effect) => {
    const children = variants.flatMap((variant) => {
      const matching = options.filter((option) =>
        hasEffect(option, effect, variant.key),
      )
      if (!matching.length) return []
      const label = variant.label
      return [
        {
          key: `effect:${effect}:${variant.key}`,
          label,
          searchText: `${label} ${effectLabels[effect] ?? ''}`,
          children: matching.map((option) =>
            makeLeaf(option, `effect:${effect}:${variant.key}:${option.key}`),
          ),
        },
      ]
    })
    if (!children.length) return []
    const label = effectLabels[effect] ?? effect
    return [{ key: `effect:${effect}`, label, searchText: label, children }]
  })
}

/** Mirrors PrimeVue Tree's lenient filter for projecting selection onto visible nodes. */
export function filterCardSkillTree(
  nodes: readonly CardSkillTreeNode[],
  query: string,
): CardSkillTreeNode[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return [...nodes]

  const filterNode = (node: CardSkillTreeNode): CardSkillTreeNode | null => {
    if (
      [node.label, node.searchText].some((text) =>
        text?.toLocaleLowerCase().includes(needle),
      )
    )
      return node
    if (!node.children?.length) return null

    const children = node.children
      .map(filterNode)
      .filter((child): child is CardSkillTreeNode => child !== null)
    return children.length ? { ...node, children } : null
  }

  return nodes
    .map(filterNode)
    .filter((node): node is CardSkillTreeNode => node !== null)
}

export function countCardSkillTreeCards(
  nodes: readonly CardSkillTreeNode[],
  visibleCardIds: readonly string[],
  cardSkills: Readonly<Record<string, readonly string[]>>,
): Record<string, number> {
  const visible = new Set(visibleCardIds)
  const cardsBySkill = new Map<string, Set<string>>()
  for (const cardId of visible) {
    for (const skill of cardSkills[cardId] ?? []) {
      const cards = cardsBySkill.get(skill) ?? new Set<string>()
      cards.add(cardId)
      cardsBySkill.set(skill, cards)
    }
  }

  const counts: Record<string, number> = {}
  const visit = (node: CardSkillTreeNode): Set<string> => {
    if (node.children?.length) {
      const cards = new Set<string>()
      for (const child of node.children) {
        for (const cardId of visit(child)) cards.add(cardId)
      }
      counts[node.key] = cards.size
      return cards
    }

    const cards = node.canonicalKey
      ? (cardsBySkill.get(node.canonicalKey) ?? new Set<string>())
      : new Set<string>()
    counts[node.key] = cards.size
    return cards
  }
  for (const node of nodes) visit(node)
  return counts
}

export function projectCardSkillTreeSelection(
  nodes: readonly CardSkillTreeNode[],
  selectedKeys: ReadonlySet<string>,
): { keys: CardSkillTreeSelectionKeys; total: number; selected: number } {
  const keys: CardSkillTreeSelectionKeys = {}
  const visit = (items: readonly CardSkillTreeNode[]) => {
    let total = 0
    let selected = 0
    for (const node of items) {
      if (node.children?.length) {
        const child = visit(node.children)
        total += child.total
        selected += child.selected
        if (child.total > 0 && child.selected === child.total) {
          keys[node.key] = { checked: true, partialChecked: false }
        } else if (child.selected > 0) {
          keys[node.key] = { checked: false, partialChecked: true }
        }
        continue
      }

      const checked = !!node.canonicalKey && selectedKeys.has(node.canonicalKey)
      if (checked) keys[node.key] = { checked: true, partialChecked: false }
      total += 1
      if (checked) selected += 1
    }
    return { total, selected }
  }

  const counts = visit(nodes)
  return { keys, ...counts }
}

/** Applies changed leaf occurrences while retaining selections outside the rendered tree. */
export function updateCardSkillTreeSelection(
  nodes: readonly CardSkillTreeNode[],
  selectedKeys: ReadonlySet<string>,
  nextKeys: Readonly<CardSkillTreeSelectionKeys>,
): string[] {
  const leaves = new Map<string, string>()
  const visit = (items: readonly CardSkillTreeNode[]) => {
    for (const node of items) {
      if (node.canonicalKey) leaves.set(node.key, node.canonicalKey)
      if (node.children) visit(node.children)
    }
  }
  visit(nodes)

  const previousChecked = new Set(
    [...leaves]
      .filter(([, canonical]) => selectedKeys.has(canonical))
      .map(([key]) => key),
  )
  const nextChecked = new Set(
    [...leaves.keys()].filter((key) => nextKeys[key]?.checked === true),
  )
  const result = new Set(selectedKeys)
  for (const key of previousChecked) {
    if (!nextChecked.has(key)) {
      const canonical = leaves.get(key)
      if (canonical) result.delete(canonical)
    }
  }
  for (const key of nextChecked) {
    if (!previousChecked.has(key)) {
      const canonical = leaves.get(key)
      if (canonical) result.add(canonical)
    }
  }
  return [...result].sort()
}
