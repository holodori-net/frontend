import {
  cardRarityFrameCount,
  cardRarityFramePolygons,
} from '#shared/game-data/card-rarity-animation'

const frameSize = 200
const gridSize = Math.sqrt(cardRarityFrameCount)
const atlasSize = frameSize * gridSize

export async function createCardRaritySpriteAtlas(
  image: CanvasImageSource,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = atlasSize
  canvas.height = atlasSize

  try {
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to create a 2D canvas context')

    cardRarityFramePolygons.forEach((polygon, frame) => {
      const column = frame % gridSize
      const row = Math.floor(frame / gridSize)
      const left = column * frameSize
      const top = row * frameSize

      context.save()
      context.beginPath()
      polygon.forEach(([x, y], index) => {
        const pointX = left + x
        const pointY = top + y
        if (index === 0) context.moveTo(pointX, pointY)
        else context.lineTo(pointX, pointY)
      })
      context.closePath()
      context.clip()
      context.drawImage(
        image,
        left,
        top,
        frameSize,
        frameSize,
        left,
        top,
        frameSize,
        frameSize,
      )
      context.restore()
    })

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Unable to encode the rarity sprite atlas'))
      }, 'image/png')
    })
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}
