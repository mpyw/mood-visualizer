import { describe, expect, it } from 'vitest'
import { parseJsonl } from './jsonl'

const isNumberBox = (v: unknown): v is { n: number } =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as { n?: unknown }).n === 'number'

describe('parseJsonl', () => {
  it('skips blank, broken and invalid lines', () => {
    const text = [
      '{"n":1}',
      '',
      '   ',
      '{"n":2',
      '{"n":"3"}',
      '  {"n":4}  ',
      'null',
      '',
    ].join('\n')
    expect(parseJsonl(text, isNumberBox)).toEqual([{ n: 1 }, { n: 4 }])
  })

  it('accepts CRLF line endings', () => {
    expect(parseJsonl('{"n":1}\r\n{"n":2}\r\n', isNumberBox)).toEqual([
      { n: 1 },
      { n: 2 },
    ])
  })
})
