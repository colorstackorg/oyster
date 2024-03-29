import { json, LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { Login, Public, Text } from '@oyster/ui';

import { Route } from '../shared/constants';

export const LoginSearchParams = z.object({
  context: z.enum(['claim-swag-pack']).nullish().catch(null),
});

export type LoginSearchParams = z.infer<typeof LoginSearchParams>;

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  const { context } = LoginSearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  const title: string =
    context === 'claim-swag-pack' ? 'Claim Swag Pack 🎁' : 'ColorStack Profile';

  // We're only going to show the description for the Claim Swag Pack flow
  // in the initial login page, and not any subsequent OTP (or other) pages.
  const isFirstLoginPage: boolean =
    new URL(request.url).pathname === Route.LOGIN;

  const description: string | null =
    context === 'claim-swag-pack' && isFirstLoginPage
      ? "In order to claim your swag pack, we'll just need to authenticate your email by sending you a one-time passcode."
      : null;

  return json({
    description,
    title,
  });
}

export default function LoginLayout() {
  const { description, title } = useLoaderData<typeof loader>();

  return (
    <Public.Content>
      <Login.Title>{title}</Login.Title>
      {description && <Text color="gray-500">{description}</Text>}
      <Outlet />
    </Public.Content>
  );
}
