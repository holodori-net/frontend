import { describe, expect, it } from 'vitest'
import {
  getCardMovieUrl,
  getCardVoiceUrl,
} from '../shared/game-data/card-icons.ts'

describe('card movie URLs', () => {
  it('preserves the asset ID and builds each movie variant URL', () => {
    const assetId = '00006-5-uniq-0074-00'

    expect(getCardMovieUrl(assetId, 'full_0')).toBe(
      'https://assets.holodori.net/cdn/mov_card_full_0_00006-5-uniq-0074-00.usm/VideoClip/mov_card_full_0_00006-5-uniq-0074-00.webm',
    )
    expect(getCardMovieUrl(assetId, 'full_1')).toBe(
      'https://assets.holodori.net/cdn/mov_card_full_1_00006-5-uniq-0074-00.usm/VideoClip/mov_card_full_1_00006-5-uniq-0074-00.webm',
    )
    expect(getCardMovieUrl(assetId, 'sign')).toBe(
      'https://assets.holodori.net/cdn/mov_card_sign_00006-5-uniq-0074-00.usm/VideoClip/mov_card_sign_00006-5-uniq-0074-00.webm',
    )
  })

  it('returns null when the card has no asset ID', () => {
    expect(getCardMovieUrl(null, 'sign')).toBeNull()
  })
})

describe('card voice URLs', () => {
  it('preserves the voice asset ID and builds its FLAC URL', () => {
    const assetId = 'vo_card_cmn_00006_00006-5-uniq-0074-00_situation'

    expect(getCardVoiceUrl(assetId)).toBe(
      `https://assets.holodori.net/cdn/${assetId}.acb/AudioClip/${assetId}.flac`,
    )
  })

  it('returns null when the card has no voice asset ID', () => {
    expect(getCardVoiceUrl(null)).toBeNull()
  })
})
