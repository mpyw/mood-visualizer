/**
 * Opens a served build in a real browser and checks that the data loads.
 * CI runs it against `build:ci` under the GitHub Pages base path, which unit
 * tests cannot cover.
 *
 * Usage: SMOKE_URL=http://localhost:4173/mood-visualizer/ tsx scripts/smoke.mts
 */
import { launch } from 'puppeteer'

const URL = process.env.SMOKE_URL || 'http://localhost:4173/'

const browser = await launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})
try {
  const page = await browser.newPage()
  const failures: string[] = []
  page.on('pageerror', (e) => failures.push(`page error: ${String(e)}`))
  page.on('response', (res) => {
    if (res.status() >= 400) failures.push(`HTTP ${res.status()} ${res.url()}`)
  })

  await page.goto(URL, { waitUntil: 'networkidle0' })
  const options = await page.$$eval('select option', (els) => els.length)
  const dots = await page.$$eval('[data-testid^="dot-"]', (els) => els.length)
  if (options === 0) failures.push('no months in the selector')
  if (dots === 0) failures.push('no dots in the chart')

  // Show every record so that the timeline has cards with avatars.
  const notesOnly = await page.$('::-p-aria(Note 付きのみ)')
  if (await notesOnly?.evaluate((el) => (el as HTMLInputElement).checked)) {
    await notesOnly?.click()
  }
  await page.waitForNetworkIdle()
  const cards = await page.$$eval('article img', (imgs) => ({
    total: imgs.length,
    broken: imgs.filter((img) => !(img as HTMLImageElement).naturalWidth)
      .length,
  }))
  if (cards.total === 0) failures.push('no timeline cards')
  if (cards.broken > 0)
    failures.push(`${cards.broken} avatar images did not load`)

  if (failures.length > 0) {
    console.error(`Smoke test failed for ${URL}:\n- ${failures.join('\n- ')}`)
    process.exitCode = 1
  } else {
    console.log(
      `Smoke test passed: ${options} months, ${dots} dots, ${cards.total} cards`
    )
  }
} finally {
  await browser.close()
}
