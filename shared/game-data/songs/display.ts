export const SONG_LIST_FIELDS = [
  'category',
  'duration',
  'charts',
  'title',
  'singer',
  'notes',
  'unlock',
  'availability',
  'musicVideos',
  'streamingMute',
] as const
export type SongListField = (typeof SONG_LIST_FIELDS)[number]
