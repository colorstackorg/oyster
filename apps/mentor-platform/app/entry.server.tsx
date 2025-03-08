import type { EntryContext } from '@remix-run/node';
import { createReadableStreamFromReadable } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import * as Sentry from '@sentry/remix';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone.js';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc.js';
import isbot from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'stream';

import { getCookie, run } from '@oyster/utils';

import { ENV } from '@/shared/constants.server';

// Importing this file ensures that our application has all of the environment
// variables necessary to run. If any are missing, this file will throw an error
// and crash the application.
import '@/shared/constants.server';

run(() => {
  dayjs.extend(utc);
  dayjs.extend(relativeTime);
  dayjs.extend(timezone);
  dayjs.extend(advancedFormat);
  dayjs.extend(updateLocale);

  // To use relative times in Day.js, we need to extend some of the above plugins,
  // and now we'll update the format of the relative time to be more concise.
  // https://day.js.org/docs/en/customization/relative-time
  dayjs.updateLocale('en', {
    relativeTime: {
      past: '%s',
      s: '%ds',
      m: '1m',
      mm: '%dm',
      h: '1h',
      hh: '%dh',
      d: '1d',
      dd: '%dd',
      M: '1mo',
      MM: '%dmo',
      y: '1y',
      yy: '%dy',
    },
  });
});

Sentry.init({
  dsn: ENV.SENTRY_DSN,
  enabled: ENV.ENVIRONMENT !== 'development',
  environment: ENV.ENVIRONMENT,
  tracesSampleRate: 0.5,
});

const ABORT_DELAY = 5000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  const bot: boolean = isbot(request.headers.get('user-agent'));

  return bot
    ? handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext
      )
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext
      );
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        onAllReady: () => {
          const body = new PassThrough();

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(createReadableStreamFromReadable(body), {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode,
            })
          );

          pipe(body);
        },
        onShellError: (error: unknown) => {
          reject(error);
        },
        onError: (error: unknown) => {
          didError = true;

          console.error(error);
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        onShellReady: () => {
          const cookie = request.headers.get('Cookie');

          const timezone = getCookie(cookie || '', 'timezone');

          // @see https://www.jacobparis.com/content/remix-ssr-dates
          // In order to match the timezone of dates on both the client and
          // the server, we need to get the timezone from the client. How we're
          // doing this: if that timezone cookie value isn't present, then we're
          // setting a cookie with the timezone on the client and reloading the
          // page.
          if (!timezone) {
            return resolve(
              new Response(
                `
                  <html>
                    <body>
                      <script>
                        document.cookie = 'timezone=' + Intl.DateTimeFormat().resolvedOptions().timeZone + '; path=/';
                        window.location.reload();
                      </script>
                    </body>
                  </html>
                `,
                {
                  headers: {
                    'Content-Type': 'text/html',
                    'Set-Cookie': 'timezone=America/New_York; path=/',
                    Refresh: `0; url=${request.url}`,
                  },
                }
              )
            );
          }

          const body = new PassThrough();

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(createReadableStreamFromReadable(body), {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode,
            })
          );

          pipe(body);
        },
        onShellError: (error: unknown) => {
          reject(error);
        },
        onError: (error: unknown) => {
          didError = true;

          console.error(error);
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
