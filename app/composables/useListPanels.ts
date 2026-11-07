import { computed, readonly } from 'vue'

type ListPage = 'cards' | 'songs'
type Panel = 'filters' | 'display'

const DEFAULT_PANELS: Record<ListPage, Panel[]> = {
  cards: [],
  songs: [],
}

function isPanelList(value: unknown): value is Panel[] {
  return (
    Array.isArray(value) &&
    value.every((panel) => panel === 'filters' || panel === 'display')
  )
}

export function useListPanels(page: ListPage) {
  const panelsState = useState<Panel[]>(`list-panels-${page}`, () => [
    ...DEFAULT_PANELS[page],
  ])
  const initializedState = useState<boolean>(
    `list-panels-${page}-initialized`,
    () => false,
  )
  const storageKey = `holodori-${page}-panels`

  const panels = computed({
    get: () => panelsState.value,
    set: (value: Panel[]) => {
      panelsState.value = value
      if (!initializedState.value) return

      try {
        sessionStorage.setItem(storageKey, JSON.stringify(value))
      } catch (error) {
        console.warn('Holodori list panel preference could not be saved', error)
      }
    },
  })

  onMounted(() => {
    if (initializedState.value) return

    try {
      const storedValue = sessionStorage.getItem(storageKey)
      if (storedValue === null) return

      const value: unknown = JSON.parse(storedValue)
      panelsState.value = isPanelList(value) ? value : [...DEFAULT_PANELS[page]]
    } catch (error) {
      console.warn('Holodori list panel preference could not be read', error)
      panelsState.value = [...DEFAULT_PANELS[page]]
    } finally {
      initializedState.value = true
    }
  })

  return { panels, initialized: readonly(initializedState) }
}
