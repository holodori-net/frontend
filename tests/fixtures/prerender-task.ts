import { threadId } from 'node:worker_threads'
import type {
  PrerenderResult,
  PrerenderTask,
} from '../../scripts/prerender/protocol.ts'

type TestTask = Partial<PrerenderTask> & {
  route: string
  mode?: 'exit' | 'throw'
  exitCode?: number
  delay?: number
  status?: number
  statusText?: string
  responseHeaders?: [string, string][]
  body?: ArrayBuffer
}

export type TestResult = PrerenderResult & {
  route: string
  threadId: number
  requestHeaders: [string, string][]
  retry?: number
  retryDelay?: number
}

export async function renderTestTask(task: TestTask): Promise<TestResult> {
  if (task.mode === 'exit') process.exit(task.exitCode)
  if (task.mode === 'throw') throw new Error('fixture render failed')

  await new Promise((resolve) => setTimeout(resolve, task.delay ?? 25))
  const body = task.body ?? new TextEncoder().encode(task.route).buffer

  return {
    route: task.route,
    threadId,
    status: task.status ?? 200,
    statusText: task.statusText ?? 'OK',
    headers: task.responseHeaders ?? [],
    requestHeaders: task.headers ?? [],
    retry: task.retry,
    retryDelay: task.retryDelay,
    body,
  }
}
