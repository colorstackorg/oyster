import { createReadableStreamFromReadable } from '@react-router/node';
import * as Sentry from '@sentry/remix';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone.js';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc.js';
import isbot from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import { type EntryContext, ServerRouter } from 'react-router';
import { PassThrough } from 'stream';

import { getCookie, run } from '@oyster/utils';

// Importing this file ensures that our application has all of the environment
// variables necessary to run. If any are missing, this file will throw an error
// and crash the application.
import { ENV } from '@/shared/constants.server';

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

// Reject/cancel all pending promises after 5 seconds.
export const streamTimeout = 5000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext
) {
  const bot: boolean = isbot(request.headers.get('user-agent'));

  return bot
    ? handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        reactRouterContext
      )
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        reactRouterContext
      );
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext
) {
  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={reactRouterContext} url={request.url} />,
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

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents.
    setTimeout(abort, streamTimeout + 1000);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext
) {
  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={reactRouterContext} url={request.url} />,
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

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents.
    setTimeout(abort, streamTimeout + 1000);
  });
}
