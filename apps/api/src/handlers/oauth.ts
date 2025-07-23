import { type BunRequest } from 'bun';
import { match } from 'ts-pattern';
import { z } from 'zod';

import {
  exchangeLinkedInCodeForToken,
  getLinkedInTokenInfo,
  loginWithOAuth,
  OAuthCodeState,
  saveGoogleDriveCredentials,
} from '@oyster/core/api';
import { track } from '@oyster/core/mixpanel';

import { BunResponse } from '../shared/bun-response';

function createOAuthSearchParamsSchema<T extends z.ZodSchema>(stateSchema: T) {
  return z
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
          .pipe(stateSchema),
      })
    );
}

const OAuthSearchParams = createOAuthSearchParamsSchema(
  OAuthCodeState.optional()
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

const LinkedInOAuthSearchParams = createOAuthSearchParamsSchema(
  OAuthCodeState.pick({
    clientRedirectUrl: true,
    oauthRedirectUrl: true,
  })
);

export async function handleLinkedInOauth(req: BunRequest) {
  const { searchParams } = new URL(req.url);
  const result = LinkedInOAuthSearchParams.safeParse(searchParams);

  if (!result.success) {
    return BunResponse.json(
      { message: 'Failed to validate request.' },
      { status: 400 }
    );
  }

  const { code, state } = result.data;

  const { accessToken } = await exchangeLinkedInCodeForToken({
    code,
    redirectUrl: state!.oauthRedirectUrl,
  });

  const { email, firstName, lastName } =
    await getLinkedInTokenInfo(accessToken);

  const redirectTo = new URL(state!.clientRedirectUrl);

  const response = BunResponse.redirect(redirectTo);

  const info = encodeURIComponent(
    JSON.stringify({ email, firstName, lastName })
  );

  response.headers.set(
    'Set-Cookie',
    `oauth_info=${info}; Path=/; Max-Age=86400; Secure; SameSite=Lax; HttpOnly`
  );

  if (redirectTo.pathname === '/apply') {
    track({
      application: 'API',
      event: 'Application Started',
      properties: {
        Email: email,
        'First Name': firstName,
        'Last Name': lastName,
      },
    });
  }

  return response;
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
      async ({ clientRedirectUrl, context, oauthRedirectUrl }) => {
        const { authToken, email } = await loginWithOAuth({
          context,
          code,
          oauthRedirectUrl,
          type,
        });

        const url = new URL(clientRedirectUrl);

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
