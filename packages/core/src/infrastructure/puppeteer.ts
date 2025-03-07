import puppeteer, { type Browser, type Page } from 'puppeteer-core';

// Environment Variable(s)

const BROWSER_WS_ENDPOINT = process.env.BROWSER_WS_ENDPOINT as string;

// Constants

const DEFAULT_TIMEOUT = 10_000; // 10s

// Core

/**
 * Returns the `document.body.innerText` of the given URL. This waits until the
 * page has loaded and the content is available.
 *
 * @param url - URL to get the content of.
 * @returns Content of the page.
 */
export async function getPageContent(url: string): Promise<string> {
  return withBrowser(async (_, page) => {
    await page.goto(url, {
      timeout: DEFAULT_TIMEOUT,
      waitUntil: 'domcontentloaded',
    });

    await page.waitForNetworkIdle({
      timeout: DEFAULT_TIMEOUT,
    });

    const content = await page.evaluate(() => {
      return document.body.innerText;
    });

    return content;
  });
}

// Helpers

/**
 * Runs the given function with a new Puppeteer browser instance and page
 * instance. It sets a random user agent string for the page and closes the
 * browser after the function has completed, regardless of whether the function
 * succeeds or throws an error.
 *
 * @param fn - Function to run with the browser.
 * @returns Result of the function.
 */
async function withBrowser<T>(
  fn: (browser: Browser, page: Page) => Promise<T>
): Promise<T> {
  const browser = await puppeteer.connect({
    browserWSEndpoint: BROWSER_WS_ENDPOINT,
  });

  console.log('Launched Puppeteer browser.');

  const page = await browser.newPage();

  await escapeBotDetection(page);

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

async function escapeBotDetection(page: Page) {
  await page.setViewport({
    deviceScaleFactor: 1,
    height: 1080,
    width: 1920,
  });

  await page.setUserAgent(getUserAgent());

  // Add random mouse movements.
  await page.mouse.move(
    100 + Math.random() * 100, // x
    100 + Math.random() * 100, // y
    { steps: 10 }
  );
}

const USER_AGENTS = [
  // Chrome
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',

  // Firefox
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',

  // Safari
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',

  // Edge
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.2365.66',
] as const;

/**
 * Returns a random user agent string from the list of `USER_AGENTS`. This
 * helps us avoid detection by some websites and also allows us to follow
 * redirects.
 *
 * @returns Random user agent string.
 */
function getUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
