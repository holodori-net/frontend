export function getSongImageUrl(jacketAssetId: string): string {
  const name = `img_music_jacket_${jacketAssetId}`
  return `https://assets.holodori.net/cdn/${name}/Texture2D/${name}.webp`
}
