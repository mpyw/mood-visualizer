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
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n<title>${AUTHOR} Mood Feed</title>\n<link>${SITE_URL}</link>\n<description>${AUTHOR} の気分変化RSS</description>\n<language>ja</language>\n${items
    .map(
      (item) => `  <item>\n    <title>Score: ${item.score}${item.note ? ' - ' + escapeXml(item.note) : ''}</title>\n    <pubDate>${new Date(item.date).toUTCString()}</pubDate>\n    <guid>${SITE_URL}#${item.date}</guid>\n    <description>${item.note ? escapeXml(item.note) : ''}</description>\n    <score>${item.score}</score>\n    <note>${item.note ? escapeXml(item.note) : ''}</note>\n  </item>`
    )
    .join('\n')}\n</channel>\n</rss>\n`
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
