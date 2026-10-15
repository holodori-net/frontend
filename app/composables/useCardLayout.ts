import { computed, readonly } from 'vue'
import type { CardListLayout } from '#shared/game-data/card-list'

const STORAGE_KEY = 'holodori-card-layout'

function isCardListLayout(value: string | null): value is CardListLayout {
  return value === 'full' || value === 'vertical'
}

export function useCardLayout() {
  const layoutState = useState<CardListLayout>('card-list-layout', () => 'full')
  const initializedState = useState<boolean>(
    'card-list-layout-initialized',
    () => false,
  )

  const layout = computed({
    get: () => layoutState.value,
    set: (value: CardListLayout) => {
      layoutState.value = value
      if (!initializedState.value) return

      try {
        localStorage.setItem(STORAGE_KEY, value)
      } catch (error) {
        console.warn(
          'Holodori card layout preference could not be saved',
          error,
        )
      }
    },
  })

  onMounted(() => {
    if (initializedState.value) return

    try {
      const value = localStorage.getItem(STORAGE_KEY)
      layoutState.value = isCardListLayout(value) ? value : 'full'
    } catch (error) {
      console.warn('Holodori card layout preference could not be read', error)
      layoutState.value = 'full'
    } finally {
      initializedState.value = true
    }
  })

  return { layout, initialized: readonly(initializedState) }
}
