import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import {
  isNavigationFailure,
  NavigationFailureType,
  type LocationQuery,
} from 'vue-router'

type MaybePromise<T> = T | Promise<T>

type ListRouteSyncOptions<Conditions> = {
  createConditions: () => Conditions
  parseQuery: (
    query: LocationQuery,
    isCurrent: () => boolean,
  ) => MaybePromise<Conditions>
  toQuery: (
    conditions: Conditions,
    query: LocationQuery,
    isCurrent: () => boolean,
  ) => MaybePromise<LocationQuery | undefined>
  beforeNavigate?: (href: string) => boolean
  onConditionsChange?: () => void
  onWritten?: () => void
  onWriteError: (cause: unknown, rejected: boolean) => void
}

export function useListRouteSync<Conditions extends { q: string }>(
  options: ListRouteSyncOptions<Conditions>,
) {
  const route = useRoute()
  const router = useRouter()
  const conditions = ref(options.createConditions()) as Ref<Conditions>
  const ready = ref(false)
  let applyingRoute = false
  let suppressConditionWatch = false
  let disposed = false
  let mounted = false
  let revision = 0
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  const pendingNavigations = new Map<string, number>()

  const clearSearchTimer = () => {
    if (searchTimer !== undefined) clearTimeout(searchTimer)
    searchTimer = undefined
  }
  const invalidatePending = () => {
    revision += 1
    clearSearchTimer()
  }
  const isCurrent = (currentRevision: number) =>
    !disposed && currentRevision === revision

  const applyRoute = () => {
    invalidatePending()
    const currentRevision = revision
    const currentPath = route.fullPath
    const isCurrentRoute = () =>
      isCurrent(currentRevision) && currentPath === route.fullPath
    const apply = (parsed: Conditions) => {
      if (!isCurrentRoute()) return
      applyingRoute = true
      conditions.value = parsed
      applyingRoute = false
      ready.value = mounted
    }
    const parsed = options.parseQuery({ ...route.query }, isCurrentRoute)
    if (parsed instanceof Promise) void parsed.then(apply)
    else apply(parsed)
  }

  const writeRoute = async (replace: boolean, currentRevision: number) => {
    try {
      const queryResult = options.toQuery(conditions.value, route.query, () =>
        isCurrent(currentRevision),
      )
      const query =
        queryResult instanceof Promise ? await queryResult : queryResult
      if (!query || !isCurrent(currentRevision)) return
      const location = { query, hash: route.hash }
      const resolved = router.resolve(location)
      if (options.beforeNavigate?.(resolved.href) === false) return
      pendingNavigations.set(resolved.href, currentRevision)
      const result = await (replace ? router.replace : router.push)(location)
      if (pendingNavigations.get(resolved.href) === currentRevision) {
        pendingNavigations.delete(resolved.href)
      }
      if (!isCurrent(currentRevision)) return
      if (
        isNavigationFailure(result) &&
        !isNavigationFailure(result, NavigationFailureType.duplicated)
      ) {
        options.onWriteError(result, true)
        return
      }
      options.onWritten?.()
    } catch (cause) {
      for (const [path, pendingRevision] of pendingNavigations) {
        if (pendingRevision === currentRevision) pendingNavigations.delete(path)
      }
      if (isCurrent(currentRevision)) options.onWriteError(cause, false)
    }
  }

  onMounted(() => {
    mounted = true
    applyRoute()
  })
  watch(
    () => route.fullPath,
    (fullPath) => {
      if (pendingNavigations.has(fullPath)) {
        pendingNavigations.delete(fullPath)
        return
      }
      if (mounted) applyRoute()
    },
    { flush: 'sync' },
  )
  watch(
    () =>
      Object.fromEntries(
        Object.entries(conditions.value).map(([key, value]) => [
          key,
          Array.isArray(value) ? [...value] : value,
        ]),
      ),
    (next, previous) => {
      if (!ready.value || applyingRoute || suppressConditionWatch) return
      const searchOnly =
        next.q !== previous.q &&
        Object.keys(next).every((key) => {
          if (key === 'q') return true
          const value = next[key]
          const oldValue = previous[key]
          return Array.isArray(value) && Array.isArray(oldValue)
            ? value.join('\0') === oldValue.join('\0')
            : value === oldValue
        })
      const currentRevision = ++revision
      clearSearchTimer()
      options.onConditionsChange?.()
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
    pendingNavigations.clear()
  })
  const reset = () => {
    invalidatePending()
    suppressConditionWatch = true
    conditions.value = options.createConditions()
    suppressConditionWatch = false
    void writeRoute(false, revision)
  }
  return { conditions, ready, reset }
}
