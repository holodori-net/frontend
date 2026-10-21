<script setup lang="ts">
import { ChevronsDownUp, ChevronsUpDown } from '@lucide/vue'
import { gameLocaleLanguages, type GameLocale } from '#shared/language'
import type {
  CardSkillEffect,
  CardSkillFilterCatalog,
  CardSkillKind,
} from '#shared/game-data/card-skill-filter'
import {
  buildCardSkillEffectTree,
  countCardSkillTreeCards,
  filterCardSkillTree,
  projectCardSkillTreeSelection,
  updateCardSkillTreeSelection,
  type CardSkillTreeNode,
  type CardSkillTreeSelectionKeys,
} from '#shared/game-data/card-skill-tree'
import type { TreeNode } from 'primevue/treenode'
import { useId } from 'vue'

type Grouping = 'effect' | 'kind'
type SelectionKeys = CardSkillTreeSelectionKeys
interface FilterNode extends TreeNode {
  key: string
  label: string
  searchText: string
  canonicalKey?: string
  children?: FilterNode[]
  data?: { kind?: CardSkillKind; description?: string }
}

const props = defineProps<{
  catalog: CardSkillFilterCatalog
  gameLocale: GameLocale
  modelValue: string[]
  visibleCardIds: readonly string[]
  disabled?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
const { t } = useI18n()
const id = useId()
const grouping = ref<Grouping>('effect')
const filterQuery = ref('')
const dialogVisible = ref(false)
const expandedKeys = ref<Record<string, boolean>>({})
const tabIds = {
  effect: `${id}-effect-tab`,
  kind: `${id}-kind-tab`,
}
const treePanelId = `${id}-tree-panel`
const dialogId = `${id}-dialog`
const dialogPt = {
  root: { id: dialogId },
  header: { class: '!px-4 !py-2' },
  content: {
    class: 'flex min-h-0 flex-1 flex-col overflow-hidden !px-4 !pb-2',
  },
  footer: { class: '!px-4 !pb-3' },
}
const kindOrder: CardSkillKind[] = ['passive', 'active', 'special', 'leader']
const effectOrder: CardSkillEffect[] = [
  'performance',
  'technique',
  'sense',
  'allStats',
  'scoreUp',
  'scoreSupport',
  'activationRate',
  'lifeRecovery',
  'judgement',
]
const variantOrder = ['all', 'conditional', 'pure', 'additional'] as const

const tree = computed<FilterNode[]>(() => {
  const nodes: FilterNode[] = []
  const makeLeaf = (
    option: CardSkillFilterCatalog['options'][number],
    key: string,
  ): FilterNode => {
    const description =
      option.descriptions[props.gameLocale] || t('cardList.skillUnavailable')
    const kind = t(`cardList.skills.kind.${option.kind}`)
    return {
      key,
      label: `${kind} · ${description}`,
      searchText: `${kind} ${description} ${Object.values(option.descriptions).join(' ')}`,
      selectable: true,
      canonicalKey: option.key,
      data: { kind: option.kind, description },
    }
  }
  const matching = (
    predicate: (option: CardSkillFilterCatalog['options'][number]) => boolean,
  ) => props.catalog.options.filter(predicate)

  if (grouping.value === 'kind') {
    for (const kind of kindOrder) {
      const options = matching((option) => option.kind === kind)
      if (!options.length) continue
      nodes.push({
        key: `kind:${kind}`,
        label: t(`cardList.skills.kind.${kind}`),
        searchText: t(`cardList.skills.kind.${kind}`),
        children: options.map((option) =>
          makeLeaf(option, `kind:${kind}:${option.key}`),
        ),
      })
    }
    return nodes
  }

  const effectLabels = Object.fromEntries(
    effectOrder.map((effect) => [
      effect,
      t(`cardList.skills.effect.${effect}`),
    ]),
  )
  return buildCardSkillEffectTree(
    props.catalog.options,
    effectOrder,
    variantOrder.map((key) => ({
      key,
      label: t(`cardList.skills.variantEffect.${key}`),
    })),
    effectLabels,
    makeLeaf,
  ) as FilterNode[]
})

const canonicalSet = computed(() => new Set(props.modelValue))
const visibleTree = computed<FilterNode[]>(
  () => filterCardSkillTree(tree.value, filterQuery.value) as FilterNode[],
)
const visibleCardCounts = computed(() =>
  countCardSkillTreeCards(
    visibleTree.value,
    props.visibleCardIds,
    props.catalog.cardSkills,
  ),
)
const treePt = computed(() => ({
  node: ({
    context,
  }: {
    context: { node: { key: string; label?: string } }
  }) => {
    const count = visibleCardCounts.value[context.node.key] ?? 0
    return {
      'aria-label': `${context.node.label ?? ''} · ${t('cardList.skills.cardCount', { count })}`,
    }
  },
}))
const selection = computed<SelectionKeys>(
  () =>
    projectCardSkillTreeSelection(visibleTree.value, canonicalSet.value).keys,
)
const selectedCount = computed(() => canonicalSet.value.size)

function updateSelection(next: SelectionKeys | null | undefined) {
  emit(
    'update:modelValue',
    updateCardSkillTreeSelection(
      visibleTree.value as CardSkillTreeNode[],
      canonicalSet.value,
      next ?? {},
    ),
  )
}

function clearSelection() {
  emit('update:modelValue', [])
}

function groupKeys(nodes: readonly CardSkillTreeNode[]): string[] {
  const keys: string[] = []
  for (const node of nodes) {
    if (!node.children?.length) continue
    keys.push(node.key, ...groupKeys(node.children))
  }
  return keys
}

function expandAll() {
  const next = { ...expandedKeys.value }
  for (const key of groupKeys(tree.value)) next[key] = true
  expandedKeys.value = next
}

function collapseAll() {
  const keys = new Set(groupKeys(tree.value))
  expandedKeys.value = Object.fromEntries(
    Object.entries(expandedKeys.value).filter(([key]) => !keys.has(key)),
  )
}

function openDialog() {
  filterQuery.value = ''
  dialogVisible.value = true
}
</script>

<template>
  <div class="min-w-0">
    <Button
      type="button"
      severity="secondary"
      outlined
      class="w-full justify-between"
      :disabled="disabled"
      :aria-controls="dialogId"
      :aria-expanded="dialogVisible"
      aria-haspopup="dialog"
      @click="openDialog"
    >
      <span class="truncate">
        {{
          selectedCount
            ? t('cardList.skills.selectedCount', { count: selectedCount })
            : t('cardList.skills.placeholder')
        }}
      </span>
    </Button>
    <Dialog
      v-model:visible="dialogVisible"
      :header="t('cardList.skills.placeholder')"
      modal
      :close-button-props="{
        'aria-label': t('cardList.skills.close'),
        severity: 'secondary',
        text: true,
        rounded: true,
      }"
      :style="{
        width: 'min(64rem, calc(100vw - 1rem))',
        height: '56rem',
        maxHeight: 'calc(100dvh - 2rem)',
      }"
      :pt="dialogPt"
    >
      <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <Tabs v-model:value="grouping" class="shrink-0">
          <TabList
            :pt="{ tabList: { 'aria-label': t('cardList.skills.grouping') } }"
          >
            <Tab
              :id="tabIds.effect"
              :aria-controls="treePanelId"
              value="effect"
              class="!min-h-11 !px-3 !py-2"
            >
              {{ t('cardList.skills.byEffect') }}
            </Tab>
            <Tab
              :id="tabIds.kind"
              :aria-controls="treePanelId"
              value="kind"
              class="!min-h-11 !px-3 !py-2"
            >
              {{ t('cardList.skills.byKind') }}
            </Tab>
          </TabList>
        </Tabs>
        <div
          :id="treePanelId"
          role="tabpanel"
          class="flex min-h-0 flex-1 flex-col gap-2"
          :aria-labelledby="tabIds[grouping]"
        >
          <div class="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              severity="secondary"
              size="small"
              text
              class="!size-11 !p-0"
              :aria-controls="treePanelId"
              :aria-label="t('cardList.skills.expandAll')"
              :title="t('cardList.skills.expandAll')"
              @click="expandAll"
            >
              <ChevronsUpDown
                aria-hidden="true"
                :size="20"
                :stroke-width="2"
                color="currentColor"
              />
            </Button>
            <Button
              type="button"
              severity="secondary"
              size="small"
              text
              class="!size-11 !p-0"
              :aria-controls="treePanelId"
              :aria-label="t('cardList.skills.collapseAll')"
              :title="t('cardList.skills.collapseAll')"
              @click="collapseAll"
            >
              <ChevronsDownUp
                aria-hidden="true"
                :size="20"
                :stroke-width="2"
                color="currentColor"
              />
            </Button>
            <InputText
              v-model="filterQuery"
              class="min-w-0 flex-1"
              :placeholder="t('cardList.skills.search')"
              :aria-label="t('cardList.skills.search')"
            />
          </div>
          <Tree
            :value="visibleTree"
            :selection-keys="selection"
            :expanded-keys="expandedKeys"
            selection-mode="checkbox"
            :aria-label="t('cardList.skills.label')"
            class="flex min-h-0 flex-1 flex-col !p-0"
            scroll-height="flex"
            :pt="treePt"
            @update:expanded-keys="expandedKeys = $event"
            @update:selection-keys="updateSelection"
          >
            <template #default="{ node }">
              <div class="flex min-w-0 flex-1 items-center gap-2">
                <Badge
                  :value="visibleCardCounts[node.key] ?? 0"
                  severity="secondary"
                  class="!w-10 !rounded-[var(--p-badge-border-radius)] shrink-0"
                  aria-hidden="true"
                  :title="
                    t('cardList.skills.cardCount', {
                      count: visibleCardCounts[node.key] ?? 0,
                    })
                  "
                />
                <div
                  v-if="node.canonicalKey"
                  class="min-w-0 flex-1 whitespace-normal"
                >
                  <div class="text-xs text-muted-color">
                    {{ t(`cardList.skills.kind.${node.data.kind}`) }}
                  </div>
                  <CardListSkillText
                    :text="node.data.description"
                    :lang="gameLocaleLanguages[gameLocale]"
                  />
                </div>
                <span v-else class="min-w-0 flex-1">{{ node.label }}</span>
              </div>
            </template>
          </Tree>
        </div>
      </div>
      <template #footer>
        <div class="flex w-full flex-wrap items-center justify-between gap-3">
          <div class="flex flex-col text-xs text-muted-color">
            <span>
              {{ t('cardList.skills.selectedCount', { count: selectedCount }) }}
            </span>
            <span>
              {{
                t('cardList.skills.visibleCardCount', {
                  count: props.visibleCardIds.length,
                })
              }}
            </span>
          </div>
          <div class="flex gap-2">
            <Button
              type="button"
              severity="secondary"
              text
              :disabled="disabled || !selectedCount"
              @click="clearSelection"
            >
              {{ t('cardList.skills.clear') }}
            </Button>
            <Button type="button" @click="dialogVisible = false">
              {{ t('cardList.skills.done') }}
            </Button>
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>
