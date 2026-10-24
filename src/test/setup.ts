// oxlint-disable-next-line import/no-unassigned-import -- registers matchers
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  history.replaceState(null, '', '/')
})

// jsdom does not implement these browser APIs.
Element.prototype.scrollIntoView = vi.fn<Element['scrollIntoView']>()

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
globalThis.IntersectionObserver ??=
  NoopObserver as unknown as typeof IntersectionObserver
globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver
