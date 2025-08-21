import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const HISTORY_DIR = path.join(__dirname, '../public/data/history')
const OUTPUT_PATH = path.join(__dirname, '../dist/feed.xml') // distに出力
const SITE_URL = 'https://github.com/mpyw/mood-visualizer'
const AUTHOR = '@mpyw'

function parseJsonlFile(filePath: string) {
  return fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

function escapeXml(str: string) {
  return str.replace(
    /[<>&"']/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[c] || c
  )
}

function buildRss(items: any[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:mv="https://example.com/mood-visualizer"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${AUTHOR} Mood Feed</title>
    <link>${SITE_URL}</link>
    <description>${AUTHOR} の気分変化RSS</description>
    <language>ja</language>
    <atom:link rel="self" type="application/rss+xml" href="${SITE_URL}/dist/feed.xml" />
${items
  .map(
    (item) => `    <item>
      <title>Score: ${item.score}${item.note ? ` - ${escapeXml(item.note)}` : ''}</title>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
      <guid>${SITE_URL}#${item.date}</guid>
      ${item.note ? `<description>${escapeXml(item.note)}</description>` : '<description />'}
      <mv:score>${item.score}</mv:score>
      ${item.note ? `<mv:note>${escapeXml(item.note)}</mv:note>` : '<mv:note />'}
    </item>`
  )
  .join('\n')}
  </channel>
</rss>
`
}

function main() {
  const files = fs.readdirSync(HISTORY_DIR).filter((f) => f.endsWith('.jsonl'))
  let allItems: any[] = []
  for (const file of files) {
    allItems = allItems.concat(parseJsonlFile(path.join(HISTORY_DIR, file)))
  }
  allItems.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const rss = buildRss(allItems.slice(0, 50)) // 最新50件
  fs.writeFileSync(OUTPUT_PATH, rss, 'utf-8')
  console.log('RSS feed generated:', OUTPUT_PATH)
}

main()
