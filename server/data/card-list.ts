import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type {
  CardListItemData,
  CardListPayload,
  CardListSkillData,
} from '#shared/game-data/card-list-data'
import { gameLocales } from '#shared/language'
import { composeCostumeSkillDescription } from '#shared/game-data/live-skill-description'
import { buildCardSearchTextById } from '#shared/game-data/card-list-search'
import { transformCardGrowth } from './converters/card-growth.ts'
import { transformCards } from './converters/cards.ts'
import { transformCharacters } from './converters/characters.ts'
import { createGameDatabase } from './database.ts'
import { calculateCardListStats } from './card-list-stats.ts'
import { transformLiveSkillData } from './converters/live-skills.ts'
import { transformCardSkillData } from './converters/card-skills.ts'
import { transformSkillTreeConnectEffects } from './converters/skill-tree-connect-effects.ts'
import {
  costumeIdsForCards,
  projectCardListSkills,
} from './card-list-skills.ts'

export function readCardList(): CardListPayload {
  const databasePath = resolve(process.cwd(), '.data/master.sqlite')
  console.info(`Loading card list from ${databasePath}`)

  let database: DatabaseSync | undefined
  try {
    database = new DatabaseSync(databasePath, { readOnly: true })
    const gameDatabase = createGameDatabase(database)
    const cards = transformCards(gameDatabase)
    if (cards.length === 0) {
      console.info('Loaded 0 cards, 0 costumes, 0 leader skills')
      return {
        cards: [],
        costumes: {},
        skills: emptySkills(),
        connectEffects: {},
        connectExtents: {},
        searchTextByCardId: {},
      }
    }

    const characters = transformCharacters(gameDatabase)
    const growth = transformCardGrowth(gameDatabase)
    const liveSkills = transformLiveSkillData(gameDatabase)
    const cardSkills = transformCardSkillData(gameDatabase)
    const connectData = transformSkillTreeConnectEffects(gameDatabase)
    const connectEffects: CardListPayload['connectEffects'] = {}
    const connectExtents: CardListPayload['connectExtents'] = {}
    for (const card of cards) {
      const id = card.skillTreeConnectEffectId
      if (id === null || connectEffects[id]) continue
      const levels = connectData.effects[id]
      if (!levels?.length) {
        throw new Error(
          `Card ${card.id} references missing SkillTreeConnectEffect ${id} in skill_tree_connect_effect_id`,
        )
      }
      connectEffects[id] = levels.map((level) => {
        const extentGroupId = level.skillTreeConnectEffectExtentGroupId
        const extent = connectData.extents[extentGroupId]
        if (!extent?.length) {
          throw new Error(
            `SkillTreeConnectEffect ${id} level ${level.level} references missing SkillTreeConnectEffectExtent ${extentGroupId}`,
          )
        }
        connectExtents[extentGroupId] = extent
        return {
          level: level.level,
          extentGroupId,
          description: level.description,
        }
      })
    }
    const charactersById = new Map(
      characters.map((character) => [character.id, character]),
    )

    const cardCostumeIds = costumeIdsForCards(
      cards,
      characters,
      liveSkills.costumes,
    )
    const projected = projectCardListSkills(
      liveSkills,
      cardSkills,
      cards,
      new Set(cardCostumeIds.values()),
    )
    for (const skill of Object.values(projected.skills.leaderSkills)) {
      for (const locale of gameLocales) {
        composeCostumeSkillDescription(
          skill,
          projected.skills,
          locale,
          (reason) =>
            console.warn(`[LiveLeaderSkill ${skill.id} (${locale})] ${reason}`),
        )
      }
    }
    const cardList = cards.map((card): CardListItemData => {
      const character = charactersById.get(card.characterId)
      if (!character) {
        throw new Error(
          `Card ${card.id} references missing Character ${card.characterId}`,
        )
      }

      const levelLimitRows = growth.levelLimits[card.growth.levelLimitGroupId]
      if (!levelLimitRows?.length) {
        throw new Error(
          `Card ${card.id} references missing CardLevelLimit group ${card.growth.levelLimitGroupId}`,
        )
      }
      const level = Math.max(...levelLimitRows.map((row) => row.levelLimit))
      const levelRow = growth.levels[card.growth.levelGroupId]?.find(
        (row) => row.level === level,
      )
      if (!levelRow) {
        throw new Error(
          `Card ${card.id} has no CardLevel row for group ${card.growth.levelGroupId} at level ${level}`,
        )
      }
      if (!growth.potentials[card.growth.potentialGroupId]?.length) {
        throw new Error(
          `Card ${card.id} references missing CardPotential group ${card.growth.potentialGroupId}`,
        )
      }

      return {
        id: card.id,
        characterId: card.characterId,
        costumeId: cardCostumeIds.get(card.id)!,
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
        level,
        ...calculateCardListStats(card, levelRow.parameterBaseValue, growth),
      }
    })
    const searchTextByCardId = buildCardSearchTextById({
      cards: cardList,
      ...projected,
      connectEffects,
    })
    console.info(
      `Loaded ${cardList.length} cards, ${Object.keys(projected.costumes).length} costumes, ${Object.keys(projected.skills.leaderSkills).length} leader skills, ${Object.keys(projected.skills.passiveSkills).length} passive skills, ${Object.keys(projected.skills.activeSkills).length} active skills, ${Object.keys(projected.skills.specialSkills).length} special skills, ${Object.keys(connectEffects).length} connect effects, ${Object.keys(connectExtents).length} connect extents, ${Object.keys(searchTextByCardId).length} search indexes`,
    )
    return {
      cards: cardList,
      ...projected,
      connectEffects,
      connectExtents,
      searchTextByCardId,
    }
  } catch (cause) {
    const error = new Error(`Unable to read card data from ${databasePath}`, {
      cause,
    })
    console.error(error)
    throw error
  } finally {
    database?.close()
  }
}

function emptySkills(): CardListSkillData {
  return {
    leaderSkills: {},
    passiveSkills: {},
    activeSkills: {},
    specialSkills: {},
    effects: {},
    activeEffects: {},
    triggers: {},
    targets: [],
    catalog: {
      templates: {},
      labels: { character: {}, group: {}, attribute: {}, judgement: {} },
    },
  }
}
