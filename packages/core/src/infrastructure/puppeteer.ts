import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import UserAgent from 'user-agents';

// Environment Variable(s)

const BROWSER_WS_ENDPOINT = process.env.BROWSER_WS_ENDPOINT as string;
const OXYLABS_PASSWORD = process.env.OXYLABS_PASSWORD as string;
const OXYLABS_USERNAME = process.env.OXYLABS_USERNAME as string;

/**
 * This is a comma-separated list of proxy URLs that will be used to connect to
 * the Puppeteer browser.
 */
const OXYLABS_PROXIES = (process.env.OXYLABS_PROXIES || '')
  .split(',')
  .filter(Boolean);

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
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForNetworkIdle();

    const content = await page.evaluate(() => {
      return document.body.innerText;
    });

    console.log('Page content found.', {
      length: content.length,
      status: response?.status(),
      url: url.slice(0, 50) + '...',
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

  console.log('Connected to Puppeteer browser.');

  const page = await createPage(browser);

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

async function createPage(browser: Browser) {
  let page: Page;

  // We randomly select a proxy from our available list of proxies.
  const proxy =
    OXYLABS_PROXIES[Math.floor(Math.random() * OXYLABS_PROXIES.length)];

  if (!proxy) {
    // If no proxy is found (which will only be the case in development when
    // we don't have the `OXYLABS_PROXIES` environment variable set), we use
    // the default browser context.
    page = await browser.newPage();
  } else {
    // Otherwise, we create a new browser context with the selected proxy and
    // authenticate with the proxy.
    const context = await browser.createBrowserContext({ proxyServer: proxy });

    page = await context.newPage();

    await page.authenticate({
      password: OXYLABS_PASSWORD,
      username: OXYLABS_USERNAME,
    });
  }

  await escapeBotDetection(page);

  return page;
}

async function escapeBotDetection(page: Page) {
  await page.setUserAgent(new UserAgent().toString());

  await page.setViewport({
    deviceScaleFactor: Math.random() > 0.5 ? 1 : 2,
    hasTouch: Math.random() > 0.5,
    height: 1080 + Math.floor(Math.random() * 200),
    isMobile: Math.random() > 0.5,
    width: 1920 + Math.floor(Math.random() * 200),
  });

  // Add random mouse movements.
  await page.mouse.move(
    100 + Math.random() * 100, // x
    100 + Math.random() * 100, // y
    { steps: 10 }
  );
}
