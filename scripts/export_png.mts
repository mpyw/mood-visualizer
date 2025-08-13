import * as puppeteer from 'puppeteer';
import * as fs from 'fs';

(async () => {
  const url = process.env.EXPORT_PNG_URL || 'http://localhost:4173'; // Vite dev or preview server
  console.log('[debug] url:', url);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  console.log('[debug] browser launched');
  const page = await browser.newPage();
  page.on('console', (msg) => {
    // Puppeteerブラウザ内のconsole.logをNode.js側に出力
    console.log('[browser]', msg.text());
  });
  console.log('[debug] new page created');

  // ダウンロードイベントをフック
  const client: import('puppeteer').CDPSession = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: process.cwd(),
  });
  console.log('[debug] setDownloadBehavior done');

  await page.goto(url, { waitUntil: 'networkidle0' });
  console.log('[debug] page.goto done');

  // PNGで保存ボタンを探してクリック
  const buttonText = 'PNGで保存';
  const buttonSelector = `button, input[type=button], input[type=submit]`;
  const found: boolean = await page.evaluate(
    (buttonText: string, buttonSelector: string) => {
      console.log('[browser] evaluate: 検索開始', buttonText, buttonSelector);
      const btns = Array.from(document.querySelectorAll<HTMLButtonElement | HTMLInputElement>(buttonSelector));
      for (const btn of btns) {
        if (btn.textContent && btn.textContent.trim() === buttonText) {
          console.log('[browser] ボタン見つかったのでクリック');
          btn.click();
          return true;
        }
      }
      console.log('[browser] ボタン見つからず');
      return false;
    },
    buttonText,
    buttonSelector
  );
  console.log('[debug] PNGで保存ボタン found:', found);

  if (!found) {
    console.error('PNGで保存ボタンが見つかりませんでした');
    await browser.close();
    process.exit(1);
  }

  // ダウンロード完了まで待機（最大15秒）
  let waited = 0;
  let downloadedFile: string | null = null;
  while (waited < 15000) {
    const files = fs.readdirSync(process.cwd());
    // *_mood_chart.png を探す
    const png = files.find(f => /_mood_chart\.png$/.test(f));
    const tmp = files.find(f => /_mood_chart\.png\.crdownload$/.test(f));
    if (png && !tmp) {
      downloadedFile = png;
      break;
    }
    console.log('[debug] waiting for PNG download...');
    await new Promise((r: (value: unknown) => void) => setTimeout(r, 500));
    waited += 500;
  }

  if (!downloadedFile) {
    console.error('PNGファイルのダウンロードに失敗しました');
    const files = fs.readdirSync(process.cwd());
    const tmp = files.find(f => /_mood_chart\.png\.crdownload$/.test(f));
    if (tmp) {
      console.error('一時ファイルが残っています:', tmp);
    }
    await browser.close();
    process.exit(1);
  }

  console.log('[debug] PNGファイルダウンロード完了:', downloadedFile);
  await browser.close();
  console.log('PNGエクスポート成功:', downloadedFile);
})();

