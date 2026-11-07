import { describe, expect, it } from 'vitest'
import type { MemberGroup } from '../shared/game-data/member-select.ts'
import { groupMembers } from '../shared/game-data/member-select.ts'

function createGroup(
  id: string,
  characterIds: string[],
  order: number,
): MemberGroup {
  return {
    id,
    name: {
      jpn: id,
      eng: id,
      ind: id,
      kor: id,
      cht: id,
      chs: id,
    },
    characterIds,
    order,
  }
}

describe('member selection groups', () => {
  it('keeps overlapping members in each group and follows group member order', () => {
    const members = [
      { id: 'chr-00006' },
      { id: 'chr-00010' },
      { id: 'chr-00015' },
    ]
    const groups = [
      createGroup('grp-gamers', ['chr-00006', 'chr-00010'], 2),
      createGroup('grp-gen_1', ['chr-00010', 'chr-00006'], 1),
    ]

    expect(groupMembers(members, groups)).toEqual([
      {
        id: 'grp-gen_1',
        name: groups[1]!.name,
        members: [members[1], members[0]],
      },
      {
        id: 'grp-gamers',
        name: groups[0]!.name,
        members: [members[0], members[1]],
      },
      { id: 'other', name: null, members: [members[2]] },
    ])
  })

  it('sorts groups by source order then ID and omits empty or ineligible groups', () => {
    const members = [{ id: 'b' }, { id: 'a' }]
    const groups = [
      createGroup('z', ['a'], 1),
      createGroup('empty', ['missing'], 0),
      createGroup('b', ['b'], 1),
      createGroup('a', ['a'], 1),
    ]
    const originalGroupIds = groups.map(({ id }) => id)
    const originalMemberIds = groups.map(({ characterIds }) => [
      ...characterIds,
    ])

    expect(
      groupMembers(members, groups).map(({ id, members: groupMembers }) => [
        id,
        groupMembers.map(({ id: memberId }) => memberId),
      ]),
    ).toEqual([
      ['a', ['a']],
      ['b', ['b']],
      ['z', ['a']],
    ])
    expect(groups.map(({ id }) => id)).toEqual(originalGroupIds)
    expect(groups.map(({ characterIds }) => characterIds)).toEqual(
      originalMemberIds,
    )
  })

  it('returns a stable other section for ungrouped eligible members', () => {
    const members = [{ id: 'unlisted-b' }, { id: 'unlisted-a' }]
    const groups = [createGroup('empty', [], 0)]
    const originalMemberIds = members.map(({ id }) => id)
    const originalGroupIds = groups.map(({ id }) => id)

    expect(groupMembers(members, groups)).toEqual([
      { id: 'other', name: null, members },
    ])
    expect(groupMembers(members, [])).toEqual([
      { id: 'other', name: null, members },
    ])
    expect(groupMembers([], groups)).toEqual([])
    expect(members.map(({ id }) => id)).toEqual(originalMemberIds)
    expect(groups.map(({ id }) => id)).toEqual(originalGroupIds)
  })
})
