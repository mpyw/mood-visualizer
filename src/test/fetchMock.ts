import { vi } from 'vitest'

type Route = string | (() => Promise<string>)

/**
 * Stubs `fetch` with a map from URL path to body. A function body lets a
 * test control when the response arrives. Unknown paths return 404.
 */
export function mockFetch(routes: Record<string, Route>) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = new URL(String(input), 'http://localhost').pathname
    const route = routes[path]
    if (route === undefined) return new Response('', { status: 404 })
    const body = typeof route === 'string' ? route : await route()
    init?.signal?.throwIfAborted()
    return new Response(body)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function jsonl(...values: unknown[]): string {
  return values.map((v) => JSON.stringify(v)).join('\n') + '\n'
}

/** A promise resolved from outside. */
export function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}
