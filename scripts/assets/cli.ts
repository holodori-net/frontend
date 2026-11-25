import { join } from 'node:path'
import { cardIconDirectory } from '../../shared/game-data/cards/icon-sprites.ts'
import { prepareCardIcons } from './card-icons.ts'

await prepareCardIcons(join('public', cardIconDirectory))
console.log(`Prepared card icons in public/${cardIconDirectory}`)
