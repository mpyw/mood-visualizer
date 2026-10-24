import {
  avatarFileOf,
  sortRecordsDesc,
  type MoodRecord,
} from '../src/domain/mood'

export type FeedOptions = {
  /** Site URL without a trailing slash, e.g. `https://mpyw.me/mood-visualizer`. */
  siteUrl: string
  author: string
  /** How many of the newest records to include. */
  limit: number
}

const XML_ESCAPES: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;',
}

export function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (c) => XML_ESCAPES[c])
}

function buildItem(record: MoodRecord, siteUrl: string): string {
  const avatarUrl = escapeXml(`${siteUrl}/${avatarFileOf(record.score)}`)
  const note = record.note ? escapeXml(record.note) : ''
  return `    <item>
      <title>Score: ${record.score}${note ? ` - ${note}` : ''}</title>
      <pubDate>${new Date(record.date).toUTCString()}</pubDate>
      <guid>${escapeXml(`${siteUrl}#${record.date}`)}</guid>
      ${note ? `<description>${note}</description>` : '<description />'}
      <media:thumbnail url="${avatarUrl}" />
      <mv:score>${record.score}</mv:score>
      ${note ? `<mv:note>${note}</mv:note>` : '<mv:note />'}
      <mv:avatarUrl>${avatarUrl}</mv:avatarUrl>
    </item>`
}

/** Builds an RSS 2.0 feed of the newest records. */
export function buildRss(
  records: readonly MoodRecord[],
  { siteUrl, author, limit }: FeedOptions
): string {
  const items = sortRecordsDesc(records)
    .slice(0, limit)
    .map((record) => buildItem(record, siteUrl))
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:mv="${siteUrl}/ns"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(author)} Mood Feed</title>
    <link>${siteUrl}/</link>
    <description>${escapeXml(author)} の気分変化RSS</description>
    <language>ja</language>
    <atom:link rel="self" type="application/rss+xml" href="${siteUrl}/feed.xml" />
${items.join('\n')}
  </channel>
</rss>
`
}
