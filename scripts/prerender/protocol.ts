export type PrerenderTask = {
  route: string
  headers: [string, string][]
  retry?: number
  retryDelay?: number
}

export type PrerenderResult = {
  status: number
  statusText: string
  headers: [string, string][]
  body: ArrayBuffer
}

export function createPrerenderTask(
  input: string | URL | Request,
  init?: RequestInit & { retry?: number; retryDelay?: number },
): PrerenderTask {
  const route =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url
  return {
    route,
    headers: Array.from(new Headers(init?.headers).entries()),
    retry: init?.retry,
    retryDelay: init?.retryDelay,
  }
}

export function restorePrerenderResponse(result: PrerenderResult): Response {
  const body = [204, 205, 304].includes(result.status) ? null : result.body
  return new Response(body, {
    status: result.status,
    statusText: result.statusText,
    headers: result.headers,
  })
}
