import { createReadableStreamFromReadable } from '@react-router/node';
import * as Sentry from '@sentry/react-router';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import isbot from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import {
  type EntryContext,
  type HandleErrorFunction,
  ServerRouter,
} from 'react-router';
import { PassThrough } from 'stream';

import { getCookie } from '@oyster/utils';

// Importing this file ensures that our application has all of the environment
// variables necessary to run. If any are missing, this file will throw an error
// and crash the application.
import '@/shared/constants.server';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);

// Reject/cancel all pending promises after 5 seconds.
export const streamTimeout = 5000;

export default Sentry.wrapSentryHandleRequest(handleRequest);

function handleRequest(
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

          pipe(Sentry.getMetaTagTransformer(body));
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

          pipe(Sentry.getMetaTagTransformer(body));
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

    setTimeout(abort, streamTimeout + 1000);
  });
}

export const handleError: HandleErrorFunction = (error, { request }) => {
  // React Router may abort some interrupted requests, no need to log those.
  if (!request.signal.aborted) {
    Sentry.captureException(error);
    console.error(error);
  }
};
