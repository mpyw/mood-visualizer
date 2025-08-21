import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const HISTORY_DIR = path.join(__dirname, '../public/data/history')
const OUTPUT_PATH = path.join(__dirname, '../dist/feed.xml') // distに出力
const AUTHOR = '@mpyw'

const ORIGIN = 'https://mpyw.me'
const BASE_PATH = '/mood-visualizer'
const SITE_URL = ORIGIN + BASE_PATH
const FEED_URL = SITE_URL + '/feed.xml'
const NS_URL = SITE_URL + '/ns'

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

function selectAvatarUrl(score: number): string {
  if (score >= 10) {
    return `${SITE_URL}/mpyw-star-struck.png`
  }
  if (score >= 8) {
    return `${SITE_URL}/mpyw-grinning.png`
  }
  if (score >= 6) {
    return `${SITE_URL}/mpyw-slightly_smiling_face.png`
  }
  if (score >= 4) {
    return `${SITE_URL}/mpyw-neutral_face.png`
  }
  if (score >= 2) {
    return `${SITE_URL}/mpyw-slightly_frowning_face.png`
  }
  return `${SITE_URL}/mpyw-disappointed.png`
}

function buildRss(items: any[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:mv="${NS_URL}"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${AUTHOR} Mood Feed</title>
    <link>${SITE_URL}/</link>
    <description>${AUTHOR} の気分変化RSS</description>
    <language>ja</language>
    <atom:link rel="self" type="application/rss+xml" href="${FEED_URL}" />
${items
  .map(
    (item) => `    <item>
      <title>Score: ${item.score}${item.note ? ` - ${escapeXml(item.note)}` : ''}</title>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
      <guid>${SITE_URL}#${item.date}</guid>
      ${item.note ? `<description>${escapeXml(item.note)}</description>` : '<description />'}
      <mv:score>${item.score}</mv:score>
      ${item.note ? `<mv:note>${escapeXml(item.note)}</mv:note>` : '<mv:note />'}
      <mv:avatarUrl>${selectAvatarUrl(item.score)}</mv:avatarUrl>
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
