import type { LinksFunction, MetaFunction } from '@remix-run/node';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import { withSentry } from '@sentry/remix';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone.js';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc.js';

import { Toast } from '@oyster/ui';
import uiStylesheet from '@oyster/ui/index.css?url';

import { ENV } from '@/shared/constants.server';
import { commitSession, getSession, SESSION } from '@/shared/session.server';
import tailwindStylesheet from '@/tailwind.css?url';

dayjs.extend(utc);
dayjs.extend(relativeTime);
dayjs.extend(timezone);
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

export const links: LinksFunction = () => {
  return [
    { rel: 'stylesheet', href: uiStylesheet },
    { rel: 'stylesheet', href: tailwindStylesheet },
  ];
};

export const meta: MetaFunction = () => {
  return [{ title: 'ColorStack | Member Profile' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const toast = session.get(SESSION.TOAST);

  const env: Window['env'] = {
    ENVIRONMENT: ENV.ENVIRONMENT,
    SENTRY_DSN: ENV.SENTRY_DSN,
  };

  return json(
    {
      env,
      toast: toast || null,
    },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

function App() {
  const { env, toast } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>

      <body>
        <Outlet />

        {toast && (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        )}

        <script
          // https://remix.run/docs/en/v1/guides/envvars#browser-environment-variables
          dangerouslySetInnerHTML={{
            __html: `window.env = ${JSON.stringify(env)}`,
          }}
        />

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default withSentry(App);
