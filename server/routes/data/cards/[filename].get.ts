import { readCardDetail } from '../../../data/card-detail.ts'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename') ?? ''
  const id = filename.endsWith('.json')
    ? filename.slice(0, -'.json'.length)
    : ''
  const result = readCardDetail(id)
  if (!result)
    throw createError({ statusCode: 404, statusMessage: 'Card not found' })
  return result
})
