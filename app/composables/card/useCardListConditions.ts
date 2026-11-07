import { ref, type ComputedRef } from 'vue'
import {
  createCardListConditions,
  type CardFilterOptions,
} from '#shared/game-data/cards/list'
import {
  parseCardListQuery,
  toCardListQuery,
} from '#shared/game-data/cards/list-query'
import {
  decodeCardSkillSelection,
  encodeCardSkillSelection,
  isCardSkillQuerySupported,
} from '#shared/game-data/cards/skill-query'
import { useListRouteSync } from '../useListRouteSync'

export type CardSkillQueryError = 'decode' | 'encode' | 'length' | null
const MAX_URL_BYTES = 8000

export function useCardListConditions(options: ComputedRef<CardFilterOptions>) {
  const skillQuerySupported = ref(isCardSkillQuerySupported())
  const error = ref<CardSkillQueryError>(null)
  const sync = useListRouteSync({
    createConditions: () => createCardListConditions(options.value),
    parseQuery(query, isCurrent) {
      const rawSkill = query.skill
      delete query.skill
      const finish = (
        selectedSkill: string[],
        nextError: CardSkillQueryError,
      ) => {
        const parsed = parseCardListQuery(query, options.value)
        parsed.skill = selectedSkill.filter((id) =>
          (options.value.skill ?? []).includes(id),
        )
        if (isCurrent()) error.value = nextError
        return parsed
      }
      if (rawSkill === undefined) return finish([], null)
      if (!skillQuerySupported.value) {
        console.warn(
          'Unable to decode card skill query: gzip streams are unavailable.',
        )
        return finish([], 'decode')
      }
      return (async () => {
        try {
          if (Array.isArray(rawSkill))
            throw new Error('Multiple skill query values are invalid.')
          return finish(await decodeCardSkillSelection(rawSkill ?? ''), null)
        } catch (cause) {
          console.warn('Unable to decode card skill query.', cause)
          return finish([], 'decode')
        }
      })()
    },
    toQuery(conditions, existingQuery, isCurrent) {
      const query = toCardListQuery(conditions, options.value, existingQuery)
      delete query.skill
      if (!skillQuerySupported.value) {
        if (existingQuery.skill !== undefined) query.skill = existingQuery.skill
        return query
      }
      if (!conditions.skill.length) return query
      return encodeCardSkillSelection(conditions.skill)
        .then((encoded) => {
          if (!isCurrent()) return
          if (encoded) query.skill = encoded
          return query
        })
        .catch((cause: unknown) => {
          if (!isCurrent()) return
          error.value = 'encode'
          console.warn('Unable to encode card skill query.', cause)
          return undefined
        })
    },
    beforeNavigate(href) {
      const candidateOrigin =
        typeof globalThis.location === 'undefined'
          ? undefined
          : globalThis.location.origin
      const origin =
        candidateOrigin && candidateOrigin !== 'null'
          ? candidateOrigin
          : 'http://localhost'
      const absoluteUrl = new URL(href, origin).href
      if (new TextEncoder().encode(absoluteUrl).byteLength > MAX_URL_BYTES) {
        error.value = 'length'
        console.warn(
          `Unable to update card list URL: resolved URL exceeds ${MAX_URL_BYTES} UTF-8 bytes.`,
        )
        return false
      }
      error.value = null
      return true
    },
    onWriteError(cause, rejected) {
      error.value = 'encode'
      console.warn(
        rejected
          ? 'Unable to update card list URL: navigation was rejected.'
          : 'Unable to update card list URL.',
        cause,
      )
    },
  })
  return { ...sync, skillQuerySupported, skillQueryError: error }
}
