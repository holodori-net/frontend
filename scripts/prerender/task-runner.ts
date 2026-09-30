import type Tinypool from 'tinypool'

export class PrerenderTaskRunner {
  readonly #pool: Tinypool
  readonly #pendingFailures = new Set<(error: Error) => void>()
  readonly #workerErrors = new WeakSet<object>()
  #failure: Error | undefined
  #closing = false

  constructor(pool: Tinypool) {
    this.#pool = pool
    pool.on('error', (error: Error) => this.recordFailure(error))
    for (const worker of pool.threads) {
      worker.on('error', () => {
        this.#workerErrors.add(worker)
      })
      worker.once('exit', (code) => {
        if (this.#closing || this.#workerErrors.has(worker)) return
        const error = new Error(
          `Worker thread ${worker.threadId} exited unexpectedly with code ${code}`,
        )
        this.recordFailure(error, `worker ${worker.threadId}`)
        worker.emit('error', error)
      })
    }
  }

  get failure() {
    return this.#failure
  }

  recordFailure(cause: unknown, context = 'worker pool') {
    if (this.#failure) return this.#failure
    const detail = cause instanceof Error ? cause.message : String(cause)
    this.#failure = new Error(`Prerender failed (${context}): ${detail}`, {
      cause,
    })
    for (const reject of this.#pendingFailures) reject(this.#failure)
    return this.#failure
  }

  async run<T>(task: unknown, route: string, name: string): Promise<T> {
    if (this.#failure) throw this.#failure
    const failure = Promise.withResolvers<never>()
    this.#pendingFailures.add(failure.reject)
    try {
      return await Promise.race([
        this.#pool.run(task, { name }) as Promise<T>,
        failure.promise,
      ])
    } catch (cause) {
      throw this.recordFailure(cause, `route ${route}`)
    } finally {
      this.#pendingFailures.delete(failure.reject)
    }
  }

  async destroy() {
    this.#closing = true
    try {
      await this.#pool.destroy()
    } catch (cause) {
      this.recordFailure(cause, 'worker shutdown')
    }
    // Nitro catches per-route exceptions, so shutdown must report retained failures.
    if (this.#failure) throw this.#failure
  }
}
