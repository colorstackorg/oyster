import { type BunRequest } from 'bun';
import { match } from 'ts-pattern';
import { z } from 'zod';

import {
  loginWithOAuth,
  OAuthCodeState,
  saveGoogleDriveCredentials,
} from '@oyster/core/api';

const AuthorizationCodeQuery = z.object({
  code: z.string().trim().min(1),
  state: z
    .string()
    .optional()
    .transform((value) => JSON.parse(value || '{}'))
    .transform((value) => OAuthCodeState.parse(value)),
});

type AuthorizationCodeQuery = z.infer<typeof AuthorizationCodeQuery>;

export async function handleGoogleOauth(req: BunRequest) {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams);
  const result = AuthorizationCodeQuery.safeParse(searchParams);

  if (!result.success) {
    return new Response(null, { status: 400 });
  }

  const to = await handleLogin({
    query: result.data,
    type: 'google',
  });

  return Response.redirect(to);
}

// This route is used to save the credentials to access the Google Drive API
// on behalf of the user.
export async function handleGoogleDriveOauth(req: BunRequest) {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams);
  const result = AuthorizationCodeQuery.safeParse(searchParams);

  if (!result.success) {
    return new Response(null, { status: 400 });
  }

  try {
    await saveGoogleDriveCredentials(result.data.code);

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ message: (e as Error).message }, { status: 500 });
  }
}

export async function handleSlackOauth(req: BunRequest) {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams);
  const result = AuthorizationCodeQuery.safeParse(searchParams);

  if (!result.success) {
    return new Response(null, { status: 400 });
  }

  try {
    const to = await handleLogin({
      query: result.data,
      type: 'slack',
    });

    return Response.redirect(to);
  } catch (e) {
    return Response.json({ message: (e as Error).message }, { status: 500 });
  }
}

type HandleLoginInput = {
  query: AuthorizationCodeQuery;
  type: 'google' | 'slack';
};

async function handleLogin({ query, type }: HandleLoginInput) {
  const { code, state } = query;

  return match(state)
    .with(
      { context: 'admin_login' },
      { context: 'student_login' },
      async () => {
        const { authToken, email } = await loginWithOAuth({
          context: state.context,
          code,
          oauthRedirectUrl: state.oauthRedirectUrl,
          type,
        });

        const url = new URL(state.clientRedirectUrl!);

        if (authToken) {
          url.searchParams.set('token', authToken);
          url.searchParams.set('method', type);
        } else {
          url.searchParams.set(
            'error',
            `There was no user found with this email (${email}).`
          );
        }

        return url.toString();
      }
    )
    .exhaustive();
}
