import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseJsonl } from '../src/domain/jsonl'
import { isMoodRecord } from '../src/domain/mood'
import { buildRss } from './rss'

const ROOT = join(import.meta.dirname, '..')
const HISTORY_DIR = join(ROOT, 'public/data/history')
const OUTPUT_PATH = join(ROOT, 'dist/feed.xml')

const records = readdirSync(HISTORY_DIR)
  .filter((file) => file.endsWith('.jsonl'))
  .flatMap((file) =>
    parseJsonl(readFileSync(join(HISTORY_DIR, file), 'utf-8'), isMoodRecord)
  )

writeFileSync(
  OUTPUT_PATH,
  buildRss(records, {
    siteUrl: 'https://mpyw.me/mood-visualizer',
    author: '@mpyw',
    limit: 50,
  }),
  'utf-8'
)
console.log('RSS feed generated:', OUTPUT_PATH)
