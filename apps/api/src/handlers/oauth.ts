import { type BunRequest } from 'bun';
import { match } from 'ts-pattern';
import { z } from 'zod';

import {
  exchangeLinkedinCodeForToken,
  getLinkedinProfile,
  loginWithOAuth,
  OAuthCodeState,
  saveGoogleDriveCredentials,
} from '@oyster/core/api';

import { BunResponse } from '../shared/bun-response';

const OAuthSearchParams = z
  .instanceof(URLSearchParams)
  .transform(Object.fromEntries)
  .pipe(
    z.object({
      code: z.string().trim().min(1),
      state: z
        .string()
        .optional()
        .transform((value) => {
          return value ? JSON.parse(value) : undefined;
        })
        .pipe(OAuthCodeState.optional()),
    })
  );

type OAuthSearchParams = z.infer<typeof OAuthSearchParams>;

export async function handleGoogleOauth(req: BunRequest) {
  const { searchParams } = new URL(req.url);
  const result = OAuthSearchParams.safeParse(searchParams);

  if (!result.success) {
    return BunResponse.json(
      { message: 'Failed to validate request.' },
      { status: 400 }
    );
  }

  const to = await handleLogin({
    query: result.data,
    type: 'google',
  });

  return BunResponse.redirect(to);
}

export async function handleLinkedinOauth(req: BunRequest) {
  const { searchParams } = new URL(req.url);
  const result = OAuthSearchParams.safeParse(searchParams);

  if (!result.success) {
    console.log(result.error);

    return BunResponse.json(
      { message: 'Failed to validate request.' },
      { status: 400 }
    );
  }

  const to = await handleLogin({
    query: result.data,
    type: 'google',
  });

  return BunResponse.redirect(to);
}

// This route is used to save the credentials to access the Google Drive API
// on behalf of the user.
export async function handleGoogleDriveOauth(req: BunRequest) {
  const { searchParams } = new URL(req.url);
  const result = OAuthSearchParams.safeParse(searchParams);

  if (!result.success) {
    return BunResponse.json(
      { message: 'Failed to validate request.' },
      { status: 400 }
    );
  }

  await saveGoogleDriveCredentials(result.data.code);

  return BunResponse.json({ ok: true });
}

export async function handleSlackOauth(req: BunRequest) {
  const { searchParams } = new URL(req.url);
  const result = OAuthSearchParams.safeParse(searchParams);

  if (!result.success) {
    return BunResponse.json(
      { message: 'Failed to validate request.' },
      { status: 400 }
    );
  }

  const to = await handleLogin({
    query: result.data,
    type: 'slack',
  });

  return BunResponse.redirect(to);
}

type HandleLoginInput = {
  query: OAuthSearchParams;
  type: 'google' | 'slack';
};

async function handleLogin({ query, type }: HandleLoginInput) {
  const { code } = query;

  const state = query.state!;

  return match(state)
    .with(
      { context: 'admin_login' },
      { context: 'student_login' },
      async ({ context }) => {
        const { authToken, email } = await loginWithOAuth({
          context,
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
    .with({ context: 'apply' }, async () => {
      const { accessToken } = await exchangeLinkedinCodeForToken({
        code,
        redirectUrl: state.oauthRedirectUrl,
      });

      console.log(accessToken);

      const { email } = await getLinkedinProfile(accessToken);

      console.log(email);

      const url = new URL(state.clientRedirectUrl!);

      url.searchParams.set('email', email);
      url.searchParams.set(
        'linkedin_url',
        'https://linkedin.com/in/rami-abdou'
      );

      return url.toString();
    })
    .exhaustive();
}
