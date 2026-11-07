import type { CharacterGroupData } from './character-groups.ts'

export const memberGroupsDataKey = 'member-groups'

export type MemberGroup = Pick<
  CharacterGroupData,
  'id' | 'name' | 'characterIds' | 'order'
>

export interface MemberGroupSection<T extends { id: string }> {
  id: string
  name: MemberGroup['name'] | null
  members: T[]
}

export function groupMembers<T extends { id: string }>(
  members: readonly T[],
  groups: readonly MemberGroup[],
): MemberGroupSection<T>[] {
  const membersById = new Map<string, T>()
  for (const member of members) {
    if (!membersById.has(member.id)) membersById.set(member.id, member)
  }

  const groupedIds = new Set<string>()
  const sections: MemberGroupSection<T>[] = [...groups]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .flatMap((group) => {
      const seenIds = new Set<string>()
      const groupMembers = group.characterIds.flatMap((id) => {
        const member = membersById.get(id)
        if (!member || seenIds.has(id)) return []
        seenIds.add(id)
        groupedIds.add(id)
        return [member]
      })
      return groupMembers.length
        ? [{ id: group.id, name: group.name, members: groupMembers }]
        : []
    })

  const otherIds = new Set<string>()
  const otherMembers = members.filter((member) => {
    if (groupedIds.has(member.id) || otherIds.has(member.id)) return false
    otherIds.add(member.id)
    return true
  })
  if (otherMembers.length) {
    sections.push({ id: 'other', name: null, members: otherMembers })
  }

  return sections
}
