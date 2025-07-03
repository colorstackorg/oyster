import * as Sentry from '@sentry/react-router';
import {
  data,
  isRouteErrorResponse,
  Links,
  type LinksFunction,
  type LoaderFunctionArgs,
  Meta,
  type MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from 'react-router';

import { buildMeta } from '@oyster/core/react-router';
import { Toast } from '@oyster/ui';
import uiStylesheet from '@oyster/ui/index.css?url';

import { ENV } from '@/shared/constants.server';
import { commitSession, getSession, SESSION } from '@/shared/session.server';
import tailwindStylesheet from '@/tailwind.css?url';

import { type Route } from '.react-router/types/app/+types/root';

export const links: LinksFunction = () => {
  return [
    { rel: 'stylesheet', href: uiStylesheet },
    { rel: 'stylesheet', href: tailwindStylesheet },
  ];
};

export const meta: MetaFunction = () => {
  return buildMeta({
    description: `Your home for all things ColorStack administration. Manage applications, events and more!`,
    title: 'Admin Dashboard',
  });
};

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request);

  const toast = session.get(SESSION.TOAST);

  const env: Window['env'] = {
    ENVIRONMENT: ENV.ENVIRONMENT,
    SENTRY_DSN: ENV.SENTRY_DSN,
  };

  return data(
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

export default function App() {
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

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      message = '404';
      details = 'The requested page could not be found.';
    } else {
      message = 'Error';
      details = error.statusText || details;
    }
  } else if (error && error instanceof Error) {
    Sentry.captureException(error);

    if (import.meta.env.DEV) {
      details = error.message;
      stack = error.stack;
    }
  }

  return (
    <main>
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
