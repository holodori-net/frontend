import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { asc } from 'drizzle-orm'
import type { CardData } from '#shared/game-data/cards'
import type {
  CardDetailGrowthData,
  CardDetailIndex,
  CardDetailPayload,
} from '#shared/game-data/card-detail'
import type { CardGrowthData } from '#shared/game-data/card-growth'
import { card } from './schema/cards.ts'
import { createGameDatabase } from './database.ts'
import { transformCards } from './converters/cards.ts'
import { transformCharacters } from './converters/characters.ts'
import { transformCardGrowth } from './converters/card-growth.ts'
import { transformLiveSkillData } from './converters/live-skills.ts'
import { transformCardSkillData } from './converters/card-skills.ts'
import { transformSkillTreeConnectEffects } from './converters/skill-tree-connect-effects.ts'
import {
  costumeIdsForCards,
  projectCardListSkills,
} from './card-list-skills.ts'
import { calculateCardListStats } from './card-list-stats.ts'

function withDatabase<T>(
  operation: (database: ReturnType<typeof createGameDatabase>) => T,
): T {
  const path = resolve(process.cwd(), '.data/master.sqlite')
  let client: DatabaseSync | undefined
  try {
    client = new DatabaseSync(path, { readOnly: true })
    return operation(createGameDatabase(client))
  } catch (cause) {
    const error = new Error(`Unable to read card data from ${path}`, { cause })
    console.error(error)
    throw error
  } finally {
    client?.close()
  }
}

function databasePath() {
  return resolve(process.cwd(), '.data/master.sqlite')
}

let cardDetailIndex: CardDetailIndex | undefined
export function readCardDetailIndex(): CardDetailIndex {
  if (!cardDetailIndex) {
    cardDetailIndex = withDatabase((database) => ({
      cardIds: database
        .select({ id: card.id })
        .from(card)
        .orderBy(asc(card.order), asc(card.id))
        .all()
        .map(({ id }) => id),
    }))
    console.info(
      `Loaded card detail index from ${databasePath()}: ${cardDetailIndex.cardIds.length} cards`,
    )
  }
  return cardDetailIndex
}

interface DetailSources {
  cards: CardData[]
  growth: CardGrowthData
  characters: ReturnType<typeof transformCharacters>
  liveSkills: ReturnType<typeof transformLiveSkillData>
  cardSkills: ReturnType<typeof transformCardSkillData>
  connect: ReturnType<typeof transformSkillTreeConnectEffects>
}

let sourcesCache: DetailSources | undefined
function getSources() {
  if (sourcesCache) return sourcesCache
  sourcesCache = withDatabase((database) => ({
    cards: transformCards(database),
    growth: transformCardGrowth(database),
    characters: transformCharacters(database),
    liveSkills: transformLiveSkillData(database),
    cardSkills: transformCardSkillData(database),
    connect: transformSkillTreeConnectEffects(database),
  }))
  console.info(
    `Loaded card detail sources from ${databasePath()}: ${sourcesCache.cards.length} cards`,
  )
  return sourcesCache
}

export function readCardDetail(id: string): CardDetailPayload | null {
  if (!readCardDetailIndex().cardIds.includes(id)) return null
  const sources = getSources()
  const card = sources.cards.find((item) => item.id === id)
  if (!card) return null
  const character = sources.characters.find(
    (item) => item.id === card.characterId,
  )
  if (!character)
    throw new Error(
      `Card ${id} references missing Character ${card.characterId}`,
    )
  const limits = sources.growth.levelLimits[card.growth.levelLimitGroupId]
  const levels = sources.growth.levels[card.growth.levelGroupId]
  const potentials = sources.growth.potentials[card.growth.potentialGroupId]
  if (!limits?.length)
    throw new Error(
      `Card ${id} references missing CardLevelLimit group ${card.growth.levelLimitGroupId}`,
    )
  if (!levels?.length)
    throw new Error(
      `Card ${id} references missing CardLevel group ${card.growth.levelGroupId}`,
    )
  if (!potentials?.length)
    throw new Error(
      `Card ${id} references missing CardPotential group ${card.growth.potentialGroupId}`,
    )
  const costumeIds = costumeIdsForCards(
    [card],
    [character],
    sources.liveSkills.costumes,
  )
  const projected = projectCardListSkills(
    sources.liveSkills,
    sources.cardSkills,
    [card],
    new Set(costumeIds.values()),
  )
  const connectEffects: CardDetailPayload['connectEffects'] = {}
  const connectExtents: CardDetailPayload['connectExtents'] = {}
  if (card.skillTreeConnectEffectId) {
    const effectRows = sources.connect.effects[card.skillTreeConnectEffectId]
    if (!effectRows?.length)
      throw new Error(
        `Card ${id} references missing SkillTreeConnectEffect ${card.skillTreeConnectEffectId}`,
      )
    connectEffects[card.skillTreeConnectEffectId] = effectRows.map((row) => {
      const extent =
        sources.connect.extents[row.skillTreeConnectEffectExtentGroupId]
      if (!extent?.length)
        throw new Error(
          `SkillTreeConnectEffect ${row.id} level ${row.level} references missing SkillTreeConnectEffectExtent ${row.skillTreeConnectEffectExtentGroupId}`,
        )
      connectExtents[row.skillTreeConnectEffectExtentGroupId] = extent
      return {
        level: row.level,
        extentGroupId: row.skillTreeConnectEffectExtentGroupId,
        description: row.description,
      }
    })
  }
  const maxLevel = Math.max(...limits.map((row) => row.levelLimit))
  const levelByNumber = new Map(levels.map((row) => [row.level, row]))
  for (let level = 1; level <= maxLevel; level++) {
    if (!levelByNumber.has(level))
      throw new Error(
        `Card ${id} has no CardLevel row for group ${card.growth.levelGroupId} at level ${level}`,
      )
  }
  const base = levels.find((row) => row.level === maxLevel)
  if (!base)
    throw new Error(
      `Card ${id} has no CardLevel row for group ${card.growth.levelGroupId} at level ${maxLevel}`,
    )
  const listCard = {
    id: card.id,
    characterId: card.characterId,
    costumeId: costumeIds.get(id)!,
    livePassiveSkillId: card.livePassiveSkillId,
    liveActiveSkillId: card.liveActiveSkillId,
    liveSpecialSkillId: card.liveSpecialSkillId,
    skillTreeConnectEffectId: card.skillTreeConnectEffectId,
    characterOrder: character.order,
    characterAssetId: character.assetId,
    name: card.name,
    characterName: character.name,
    rarity: card.rarity,
    attributeType: card.attributeType,
    assetId: card.assetId,
    order: card.order,
    level: maxLevel,
    ...calculateCardListStats(card, base.parameterBaseValue, sources.growth),
  }
  const growth: CardDetailGrowthData = {
    weightsPermil: card.growth.weightsPermil,
    levels: levels.map(({ level, parameterBaseValue }) => ({
      level,
      parameterBaseValue,
    })),
    levelLimits: limits.map(({ limitBreakCount, levelLimit }) => ({
      limitBreakCount,
      levelLimit,
    })),
    potentials,
  }
  const validateUnlocks = (
    name: string,
    effectType: number,
    availableLevels: readonly { level: number }[] | undefined,
  ) => {
    const requiredLevels = new Set([
      1,
      ...potentials
        .filter((row) => row.effectType === effectType)
        .map((row) => Math.max(1, row.value)),
    ])
    for (const level of requiredLevels) {
      if (!availableLevels?.some((row) => row.level === level))
        throw new Error(
          `Card ${id} potential effect type ${effectType} unlocks ${name} level ${level}, but the referenced data has no such level`,
        )
    }
  }
  validateUnlocks(
    'passive skill',
    2,
    projected.skills.passiveSkills[card.livePassiveSkillId],
  )
  validateUnlocks(
    'active skill',
    1,
    projected.skills.activeSkills[card.liveActiveSkillId],
  )
  validateUnlocks(
    'special skill',
    3,
    projected.skills.specialSkills[card.liveSpecialSkillId],
  )
  const connectUnlocks = potentials.filter((row) => row.effectType === 5)
  if (!card.skillTreeConnectEffectId && connectUnlocks.length > 0)
    throw new Error(
      `Card ${id} has Connect potential unlocks but no SkillTreeConnectEffect reference`,
    )
  if (card.skillTreeConnectEffectId)
    validateUnlocks(
      `Connect effect ${card.skillTreeConnectEffectId}`,
      5,
      connectEffects[card.skillTreeConnectEffectId],
    )
  return {
    card: listCard,
    ...projected,
    connectEffects,
    connectExtents,
    growth,
  }
}
