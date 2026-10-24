import { describe, expect, it } from 'vitest'
import { buildRss, escapeXml } from './rss'

const options = {
  siteUrl: 'https://example.com/mood',
  author: '@me',
  limit: 2,
}

describe('escapeXml', () => {
  it('escapes all XML special characters', () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;'
    )
  })
})

describe('buildRss', () => {
  const feed = buildRss(
    [
      { date: '2026-06-01T09:00:00+09:00', score: 1 },
      { date: '2026-06-03T09:00:00+09:00', score: 10, note: 'a < b & c' },
      { date: '2026-06-02T09:00:00+09:00', score: 5 },
    ],
    options
  )

  it('lists the newest records up to the limit', () => {
    const guids = [...feed.matchAll(/<guid>(.*?)<\/guid>/g)].map((m) => m[1])
    expect(guids).toEqual([
      'https://example.com/mood#2026-06-03T09:00:00+09:00',
      'https://example.com/mood#2026-06-02T09:00:00+09:00',
    ])
  })

  it('escapes notes and fills the custom namespace', () => {
    expect(feed).toContain('<title>Score: 10 - a &lt; b &amp; c</title>')
    expect(feed).toContain('<mv:note>a &lt; b &amp; c</mv:note>')
    expect(feed).toContain('<mv:score>10</mv:score>')
    expect(feed).toContain(
      '<mv:avatarUrl>https://example.com/mood/mpyw-star-struck.png</mv:avatarUrl>'
    )
    expect(feed).toContain('xmlns:mv="https://example.com/mood/ns"')
  })

  it('writes empty elements for records without a note', () => {
    const item = feed.split('<item>')[2]
    expect(item).toContain('<title>Score: 5</title>')
    expect(item).toContain('<description />')
    expect(item).toContain('<mv:note />')
  })

  it('uses RFC 822 dates', () => {
    expect(feed).toContain('<pubDate>Wed, 03 Jun 2026 00:00:00 GMT</pubDate>')
  })

  it('is well-formed XML', () => {
    const doc = new DOMParser().parseFromString(feed, 'application/xml')
    expect(doc.querySelector('parsererror')).toBeNull()
    expect(doc.querySelectorAll('item')).toHaveLength(2)
  })
})
