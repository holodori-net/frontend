import { ref, type ComputedRef } from 'vue'
import {
  createSongListConditions,
  type SongFilterOptions,
} from '#shared/game-data/songs/list'
import {
  parseSongListQuery,
  toSongListQuery,
} from '#shared/game-data/songs/list-query'
import { useListRouteSync } from '../useListRouteSync'

export function useSongListConditions(options: ComputedRef<SongFilterOptions>) {
  const queryError = ref<string | null>(null)
  const sync = useListRouteSync({
    createConditions: () => createSongListConditions(options.value),
    parseQuery: (query) => parseSongListQuery(query, options.value),
    toQuery: (conditions, query) =>
      toSongListQuery(conditions, options.value, query),
    onConditionsChange: () => {
      queryError.value = null
    },
    onWritten: () => {
      queryError.value = null
    },
    onWriteError(cause, rejected) {
      queryError.value = 'write'
      console.warn(
        rejected
          ? 'Unable to update song list URL: navigation was rejected.'
          : 'Unable to update song list URL.',
        cause,
      )
    },
  })
  return { ...sync, queryError }
}
