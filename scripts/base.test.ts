import { describe, expect, it } from 'vitest'
import { resolveBase } from './base'

describe('resolveBase', () => {
  it.each([
    [undefined, '/'],
    ['', '/'],
    ['/', '/'],
    // Regression: without the slash the app fetched /mood-visualizerdata/...
    ['/mood-visualizer', '/mood-visualizer/'],
    ['/mood-visualizer/', '/mood-visualizer/'],
  ])('%j -> %j', (input, expected) => {
    expect(resolveBase(input)).toBe(expected)
  })
})
