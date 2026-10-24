/**
 * Opens the app, clicks "PNGで保存" and waits for the chart PNG to land in the
 * current directory. The record workflow posts that file to Slack.
 */
import { readdirSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { launch } from 'puppeteer'

const URL = process.env.EXPORT_PNG_URL || 'http://localhost:4173'
const BUTTON_TEXT = 'PNGで保存'
const TIMEOUT_MS = 15_000
const PNG_SUFFIX = '_mood_chart.png'

const browser = await launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
try {
  const page = await browser.newPage()
  await page.emulateTimezone('Asia/Tokyo')
  page.on('console', (msg) => console.log('[browser]', msg.text()))

  const cdp = await page.createCDPSession()
  await cdp.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: process.cwd(),
  })

  console.log('Opening', URL)
  await page.goto(URL, { waitUntil: 'networkidle0' })

  const button = await page.waitForSelector(
    `::-p-xpath(//button[normalize-space()="${BUTTON_TEXT}"])`,
    { timeout: TIMEOUT_MS }
  )
  if (!button) throw new Error(`Button "${BUTTON_TEXT}" not found`)
  await button.click()

  const file = await waitForDownload()
  console.log('PNG exported:', file)
} finally {
  await browser.close()
}

async function waitForDownload(): Promise<string> {
  const deadline = Date.now() + TIMEOUT_MS
  while (Date.now() < deadline) {
    const files = readdirSync(process.cwd())
    const png = files.find((f) => f.endsWith(PNG_SUFFIX))
    const partial = files.some((f) => f.endsWith(`${PNG_SUFFIX}.crdownload`))
    if (png && !partial) return png
    // oxlint-disable-next-line no-await-in-loop -- polling on purpose
    await sleep(500)
  }
  throw new Error(`PNG download did not finish in ${TIMEOUT_MS} ms`)
}
