import type { LinksFunction, MetaFunction } from '@remix-run/node';
import { json, LoaderFunctionArgs } from '@remix-run/node';
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
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

import { Toast } from '@oyster/core-ui';

import coreUiStylesheet from '@oyster/core-ui/dist/index.css?url';
import tailwindStylesheet from './tailwind.css?url';

import { ENV } from './shared/constants.server';
import { commitSession, getSession, SESSION } from './shared/session.server';

dayjs.extend(utc);
dayjs.extend(timezone);

export const links: LinksFunction = () => {
  return [
    { rel: 'stylesheet', href: coreUiStylesheet },
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
        {toast && <Toast message={toast.message} type={toast.type} />}

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
