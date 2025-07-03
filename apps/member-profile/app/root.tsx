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
import { Text, Toast } from '@oyster/ui';
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
    description: `Your home for all things ColorStack membership. Manage your profile and more!`,
    title: 'Member Profile',
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
  let body: React.ReactNode | null = null;

  if (isRouteErrorResponse(error)) {
    body = (
      <div className="flex items-center gap-4">
        <Text variant="2xl">{error.status}</Text>

        <div className="h-12 w-px bg-gray-300" />

        <Text variant="sm">
          {error.data || error.statusText || 'An unexpected error occurred.'}
        </Text>
      </div>
    );
  } else if (error && error instanceof Error) {
    Sentry.captureException(error);

    body = (
      <div className="flex flex-col items-center gap-1 overflow-auto">
        <Text variant="3xl" weight="500">
          500
        </Text>

        <Text variant="sm">{error.message}</Text>

        {error.stack && (
          <pre className="mt-4 w-full overflow-auto rounded-md bg-gray-100 p-6 text-xs text-error">
            {error.stack}
          </pre>
        )}
      </div>
    );
  } else {
    body = (
      <Text variant="sm">
        An unexpected error occurred. Please contact support.
      </Text>
    );
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>

      <body>
        <div className="flex h-screen w-screen items-center justify-center overflow-auto p-4">
          {body}
        </div>
      </body>
    </html>
  );
}
