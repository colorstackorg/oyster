import puppeteer, { type Browser, type Page } from 'puppeteer';

export async function withBrowser<T>(
  fn: (browser: Browser, page: Page) => Promise<T>
) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
    timeout: 10_000,
  });

  console.log('Launched Puppeteer browser.');

  const page = await browser.newPage();

  page.setUserAgent(getUserAgent());

  try {
    const result = await fn(browser, page);

    return result;
  } finally {
    if (browser.connected) {
      await browser.close();
      console.log('Closed Puppeteer browser.');
    }
  }
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
];

function getUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
