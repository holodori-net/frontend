import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import theme from '../../app/themes/primevue.ts'
import { renderMemberThemeCss } from './member-themes.ts'
import { generatePrimeVueStyles } from './primevue.ts'

const outputPath = fileURLToPath(
  new URL('../../app/assets/css/generated.css', import.meta.url),
)
const layerOrder = 'theme, base, primevue, components, utilities'

async function main(): Promise<void> {
  const { css: primeVueCss, styleIds } = await generatePrimeVueStyles(theme)
  const memberCss = renderMemberThemeCss().trim()
  const output = [`@layer ${layerOrder};`, memberCss, primeVueCss]
    .filter(Boolean)
    .join('\n\n')
    .concat('\n')

  await mkdir(dirname(outputPath), { recursive: true })

  let previous: string | undefined
  try {
    previous = await readFile(outputPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  if (previous !== output) {
    await writeFile(outputPath, output, 'utf8')
  }

  console.log(
    `${previous === output ? 'CSS is current' : 'Generated CSS'}: ${styleIds.length} PrimeVue blocks, ${Buffer.byteLength(output)} bytes`,
  )
}

main().catch((error: unknown) => {
  console.error('Failed to generate shared CSS:', error)
  process.exitCode = 1
})
