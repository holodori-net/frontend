export async function fetchWithProgress(
  request: RequestInfo | URL,
  onBytes: (byteLength: number) => void = () => {},
  timeoutMs = 60_000,
) {
  const controller = new AbortController()
  let timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(request, { signal: controller.signal })
    if (!response.ok || response.type === 'opaque' || !response.body)
      return response
    const reader = response.body.getReader()
    const chunks: Uint8Array<ArrayBuffer>[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      clearTimeout(timeout)
      timeout = setTimeout(() => controller.abort(), timeoutMs)
      chunks.push(value)
      onBytes(value.byteLength)
    }
    return new Response(new Blob(chunks), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  } catch (cause) {
    const url = request instanceof Request ? request.url : String(request)
    throw new Error(
      `${controller.signal.aborted ? 'Download timed out' : 'Unable to download'} ${url}`,
      { cause },
    )
  } finally {
    clearTimeout(timeout)
  }
}

export async function mapConcurrent<T>(
  values: T[],
  limit: number,
  transfer: (value: T, index: number) => Promise<void>,
) {
  if (values.length === 0) return
  const concurrency = Math.max(1, Math.floor(limit))
  let next = 0
  let failure: unknown
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (next < values.length && failure === undefined) {
        const index = next++
        try {
          await transfer(values[index]!, index)
        } catch (error) {
          failure ??= error
        }
      }
    }),
  )
  if (failure !== undefined) throw failure
}
