import { build } from 'vite'
import { fileURLToPath } from 'node:url'

export async function buildLanguageEntryBootstrap() {
  const entry = fileURLToPath(
    new URL('./language-entry-bootstrap.ts', import.meta.url),
  )
  const output = await build({
    configFile: false,
    mode: process.env.NODE_ENV ?? 'development',
    logLevel: 'silent',
    publicDir: false,
    build: {
      write: false,
      minify: true,
      lib: {
        entry,
        formats: ['iife'],
        name: 'LanguageEntryBootstrap',
      },
    },
  })
  const outputs = Array.isArray(output) ? output : [output]
  const script = outputs
    .flatMap((result) => ('output' in result ? result.output : []))
    .find((item) => item.type === 'chunk')

  if (!script || script.type !== 'chunk') {
    throw new Error('Vite did not produce the language entry script')
  }
  return script.code
}
