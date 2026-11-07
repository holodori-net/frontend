import {
  memberGroupsDataKey,
  type MemberGroup,
} from '#shared/game-data/member-select'

export default defineNuxtPlugin(async () => {
  const { data, error } = await useAsyncData<MemberGroup[]>(
    memberGroupsDataKey,
    async () => {
      if (import.meta.server) {
        const { readMemberGroups } =
          await import('~~/server/data/member-groups')
        return readMemberGroups()
      }

      const groups = useNuxtApp().payload.data[memberGroupsDataKey] as
        MemberGroup[] | undefined
      if (groups) return groups

      throw createError({
        statusCode: 500,
        statusMessage: 'Member group data is unavailable',
        fatal: true,
      })
    },
  )

  if (error.value) throw error.value
  if (!data.value) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Member group data is unavailable',
      fatal: true,
    })
  }
})
