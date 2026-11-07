import type { MemberGroup } from '#shared/game-data/member-select.ts'
import { transformCharacterGroups } from './converters/character-groups.ts'
import { withGameDatabase } from './database.ts'

export function readMemberGroups(): MemberGroup[] {
  return withGameDatabase((database) => {
    const groups = transformCharacterGroups(database)
      .filter((group) => group.isRegular)
      .map(({ id, name, characterIds, order }) => ({
        id,
        name,
        characterIds,
        order,
      }))
    console.info(`Loaded ${groups.length} member groups`)
    return groups
  })
}
