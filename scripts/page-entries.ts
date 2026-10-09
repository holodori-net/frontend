export interface PageEntryRoute {
  path: string
  name?: string
  file?: string
  meta?: Record<string, unknown>
  children?: PageEntryRoute[]
}

const localizedGameRoutePrefix = /^\/:gameLocale(?:\(\))?(?=\/|$)/
export function getLanguageEntryRoutes(
  pages: readonly PageEntryRoute[],
  componentFile: string,
): PageEntryRoute[] {
  const routes: PageEntryRoute[] = []
  const names = new Set<string>()
  const paths = new Set<string>()

  function reserveNames(page: PageEntryRoute) {
    if (page.name) names.add(page.name)
    for (const child of page.children ?? []) reserveNames(child)
  }

  for (const page of pages) reserveNames(page)

  function visit(page: PageEntryRoute, parentPath = '') {
    const fullPath = page.path.startsWith('/')
      ? page.path
      : `${parentPath.replace(/\/$/, '')}/${page.path}`
    const match = localizedGameRoutePrefix.exec(fullPath)
    if (match && page.meta?.i18n !== false) {
      const rawPath = fullPath.slice(match[0].length) || '/'
      const path = rawPath === '/' ? '/' : rawPath.replace(/\/$/, '')
      if (!paths.has(path)) {
        paths.add(path)
        const slug =
          path === '/'
            ? 'home'
            : path
                .slice(1)
                .replace(/[^A-Za-z0-9_-]+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '') || 'page'
        let name = `language-entry-${slug}`
        let suffix = 2
        while (names.has(name)) name = `language-entry-${slug}-${suffix++}`
        names.add(name)
        routes.push({
          name,
          path,
          file: componentFile,
          meta: { i18n: false },
        })
      }
    }

    for (const child of page.children ?? []) visit(child, fullPath)
  }

  for (const page of pages) visit(page)
  return routes
}

export function getStaticLanguageEntryPaths(paths: readonly string[]) {
  return paths.filter((path) => !path.includes(':'))
}
