import { onBeforeUnmount, onMounted, ref, watch, type ComputedRef } from 'vue'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'
import {
  createCardListConditions,
  parseCardListQuery,
  toCardListQuery,
  type CardFilterOptions,
  type CardListConditions,
} from '#shared/game-data/card-list'
import {
  decodeCardSkillSelection,
  encodeCardSkillSelection,
  isCardSkillQuerySupported,
} from '#shared/game-data/card-skill-query'

export type CardSkillQueryError = 'decode' | 'encode' | 'length' | null
const MAX_URL_BYTES = 8000

export function useCardListConditions(options: ComputedRef<CardFilterOptions>) {
  const route = useRoute()
  const router = useRouter()
  const conditions = ref<CardListConditions>(
    createCardListConditions(options.value),
  )
  const ready = ref(false)
  const skillQuerySupported = ref(isCardSkillQuerySupported())
  const error = ref<CardSkillQueryError>(null)
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

  const applyRoute = async () => {
    invalidatePending()
    const currentRevision = revision
    const currentPath = route.fullPath
    const query = { ...route.query }
    const rawSkill = query.skill
    delete query.skill
    let selectedSkill: string[] = []
    let nextError: CardSkillQueryError = null
    if (rawSkill !== undefined) {
      if (!skillQuerySupported.value) {
        nextError = 'decode'
        console.warn(
          'Unable to decode card skill query: gzip streams are unavailable.',
        )
      } else {
        try {
          if (Array.isArray(rawSkill))
            throw new Error('Multiple skill query values are invalid.')
          selectedSkill = await decodeCardSkillSelection(rawSkill ?? '')
        } catch (cause) {
          nextError = 'decode'
          console.warn('Unable to decode card skill query.', cause)
        }
      }
    }
    if (
      disposed ||
      currentRevision !== revision ||
      currentPath !== route.fullPath
    )
      return
    const parsed = parseCardListQuery(query, options.value)
    parsed.skill = selectedSkill.filter((id) =>
      (options.value.skill ?? []).includes(id),
    )
    applyingRoute = true
    conditions.value = parsed
    error.value = nextError
    applyingRoute = false
    if (mounted) ready.value = true
  }

  const writeRoute = async (replace: boolean, currentRevision: number) => {
    const query = toCardListQuery(conditions.value, options.value, route.query)
    const skill = conditions.value.skill
    delete query.skill
    if (!skillQuerySupported.value) {
      if (route.query.skill !== undefined) {
        query.skill = route.query.skill
      }
    } else if (skill.length) {
      try {
        const encoded = await encodeCardSkillSelection(skill)
        if (disposed || currentRevision !== revision) return
        if (encoded) query.skill = encoded
      } catch (cause) {
        if (disposed || currentRevision !== revision) return
        error.value = 'encode'
        console.warn('Unable to encode card skill query.', cause)
        return
      }
    }
    if (disposed || currentRevision !== revision) return
    const location = { query, hash: route.hash }
    try {
      const resolved = router.resolve(location)
      const candidateOrigin =
        typeof globalThis.location === 'undefined'
          ? undefined
          : globalThis.location.origin
      const origin =
        candidateOrigin && candidateOrigin !== 'null'
          ? candidateOrigin
          : 'http://localhost'
      const absoluteUrl = new URL(resolved.href, origin).href
      if (new TextEncoder().encode(absoluteUrl).byteLength > MAX_URL_BYTES) {
        error.value = 'length'
        console.warn(
          `Unable to update card list URL: resolved URL exceeds ${MAX_URL_BYTES} UTF-8 bytes.`,
        )
        return
      }
      error.value = null
      pendingNavigations.set(resolved.href, currentRevision)
      const navigationFailure = await (replace ? router.replace : router.push)(
        location,
      )
      if (pendingNavigations.get(resolved.href) === currentRevision) {
        pendingNavigations.delete(resolved.href)
      }
      if (disposed || currentRevision !== revision) return
      if (
        isNavigationFailure(navigationFailure) &&
        !isNavigationFailure(
          navigationFailure,
          NavigationFailureType.duplicated,
        )
      ) {
        error.value = 'encode'
        console.warn(
          'Unable to update card list URL: navigation was rejected.',
          navigationFailure,
        )
      }
    } catch (cause) {
      for (const [path, pendingRevision] of pendingNavigations) {
        if (pendingRevision === currentRevision) pendingNavigations.delete(path)
      }
      if (disposed || currentRevision !== revision) return
      error.value = 'encode'
      console.warn('Unable to update card list URL.', cause)
    }
  }

  onMounted(() => {
    mounted = true
    void applyRoute()
  })

  watch(
    () => route.fullPath,
    (fullPath) => {
      const ownNavigationRevision = pendingNavigations.get(fullPath)
      if (ownNavigationRevision !== undefined) {
        pendingNavigations.delete(fullPath)
        return
      }
      if (mounted) void applyRoute()
    },
    { flush: 'sync' },
  )

  watch(
    () => ({
      ...conditions.value,
      character: [...conditions.value.character],
      rarity: [...conditions.value.rarity],
      attribute: [...conditions.value.attribute],
      specialization: [...conditions.value.specialization],
      skill: [...conditions.value.skill],
      connect: [...conditions.value.connect],
    }),
    (next, previous) => {
      if (!ready.value || applyingRoute || suppressConditionWatch) return

      const searchOnly =
        next.q !== previous.q &&
        next.character.join('\0') === previous.character.join('\0') &&
        next.rarity.join('\0') === previous.rarity.join('\0') &&
        next.attribute.join('\0') === previous.attribute.join('\0') &&
        next.specialization.join('\0') === previous.specialization.join('\0') &&
        next.skill.join('\0') === previous.skill.join('\0') &&
        next.connect.join('\0') === previous.connect.join('\0') &&
        next.sort === previous.sort &&
        next.direction === previous.direction

      const currentRevision = ++revision
      clearSearchTimer()
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
    conditions.value = createCardListConditions(options.value)
    suppressConditionWatch = false
    void writeRoute(false, revision)
  }

  return {
    conditions,
    reset,
    ready,
    skillQuerySupported,
    skillQueryError: error,
  }
}
