import { onBeforeUnmount, onMounted, ref, watch, type ComputedRef } from 'vue'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'
import {
  createSongListConditions,
  parseSongListQuery,
  toSongListQuery,
  type SongFilterOptions,
  type SongListConditions,
} from '#shared/game-data/song-list'

export function useSongListConditions(options: ComputedRef<SongFilterOptions>) {
  const route = useRoute()
  const router = useRouter()
  const conditions = ref<SongListConditions>(
    createSongListConditions(options.value),
  )
  const ready = ref(false)
  const queryError = ref<string | null>(null)
  let applyingRoute = false
  let suppressConditionWatch = false
  let disposed = false
  let mounted = false
  let revision = 0
  const pendingNavigations = new Map<string, number>()
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  const clearSearchTimer = () => {
    if (searchTimer !== undefined) clearTimeout(searchTimer)
    searchTimer = undefined
  }
  const invalidatePending = () => {
    revision += 1
    clearSearchTimer()
  }

  const applyRoute = () => {
    invalidatePending()
    const parsed = parseSongListQuery(route.query, options.value)
    applyingRoute = true
    conditions.value = parsed
    applyingRoute = false
    ready.value = mounted
  }

  const writeRoute = async (replace: boolean, currentRevision: number) => {
    const location = {
      query: toSongListQuery(conditions.value, options.value, route.query),
      hash: route.hash,
    }
    try {
      const resolved = router.resolve(location)
      pendingNavigations.set(resolved.href, currentRevision)
      const result = await (replace ? router.replace : router.push)(location)
      if (pendingNavigations.get(resolved.href) === currentRevision) {
        pendingNavigations.delete(resolved.href)
      }
      if (disposed || currentRevision !== revision) return
      if (
        isNavigationFailure(result) &&
        !isNavigationFailure(result, NavigationFailureType.duplicated)
      ) {
        queryError.value = 'write'
        console.warn(
          'Unable to update song list URL: navigation was rejected.',
          result,
        )
        return
      }
      queryError.value = null
    } catch (error) {
      for (const [path, pendingRevision] of pendingNavigations) {
        if (pendingRevision === currentRevision) pendingNavigations.delete(path)
      }
      if (disposed || currentRevision !== revision) return
      queryError.value = 'write'
      console.warn('Unable to update song list URL.', error)
    }
  }

  onMounted(() => {
    mounted = true
    applyRoute()
  })

  watch(
    () => route.fullPath,
    (fullPath) => {
      const ownNavigationRevision = pendingNavigations.get(fullPath)
      if (ownNavigationRevision !== undefined) {
        pendingNavigations.delete(fullPath)
        return
      }
      if (mounted) applyRoute()
    },
    { flush: 'sync' },
  )

  watch(
    () => ({
      ...conditions.value,
      character: [...conditions.value.character],
      category: [...conditions.value.category],
      singerType: [...conditions.value.singerType],
      difficulty: [...conditions.value.difficulty],
      notesDifficulty: [...conditions.value.notesDifficulty],
      streamingMute: [...conditions.value.streamingMute],
      unlock: [...conditions.value.unlock],
      video: [...conditions.value.video],
    }),
    (next, previous) => {
      if (!ready.value || applyingRoute || suppressConditionWatch) return
      const searchOnly =
        next.q !== previous.q &&
        next.character.join('\0') === previous.character.join('\0') &&
        next.category.join('\0') === previous.category.join('\0') &&
        next.singerType.join('\0') === previous.singerType.join('\0') &&
        next.difficulty.join('\0') === previous.difficulty.join('\0') &&
        next.notesDifficulty.join('\0') ===
          previous.notesDifficulty.join('\0') &&
        next.streamingMute.join('\0') === previous.streamingMute.join('\0') &&
        next.unlock.join('\0') === previous.unlock.join('\0') &&
        next.video.join('\0') === previous.video.join('\0') &&
        next.levelMin === previous.levelMin &&
        next.levelMax === previous.levelMax &&
        next.notesMin === previous.notesMin &&
        next.notesMax === previous.notesMax &&
        next.durationMin === previous.durationMin &&
        next.durationMax === previous.durationMax &&
        next.sort === previous.sort &&
        next.direction === previous.direction
      const currentRevision = ++revision
      clearSearchTimer()
      queryError.value = null
      if (searchOnly) {
        searchTimer = setTimeout(() => {
          void writeRoute(true, currentRevision)
        }, 250)
      } else {
        void writeRoute(false, currentRevision)
      }
    },
    { deep: true, flush: 'sync' },
  )

  onBeforeUnmount(() => {
    disposed = true
    invalidatePending()
  })

  const reset = () => {
    invalidatePending()
    suppressConditionWatch = true
    conditions.value = createSongListConditions(options.value)
    suppressConditionWatch = false
    void writeRoute(false, revision)
  }

  return { conditions, ready, reset, queryError }
}
