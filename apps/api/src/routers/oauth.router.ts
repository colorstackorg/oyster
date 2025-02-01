import express from 'express';
import { match } from 'ts-pattern';
import { z } from 'zod';

import {
  loginWithOAuth,
  OAuthCodeState,
  saveGoogleDriveCredentials,
} from '@oyster/core/api';

export const oauthRouter = express.Router();

oauthRouter.get('/oauth/google', async (req, res) => {
  try {
    const query = AuthorizationCodeQuery.parse(req.query);

    const to = await handleLogin({
      query,
      type: 'google',
    });

    return res.redirect(to);
  } catch (e) {
    return res.status(500).json({
      message: (e as Error).message,
    });
  }
});

// This route is used to save the credentials to access the Google Drive API
// on behalf of the user.
oauthRouter.get('/oauth/google/drive', async (req, res) => {
  try {
    const query = AuthorizationCodeQuery.pick({ code: true }).parse(req.query);

    await saveGoogleDriveCredentials(query.code);

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({
      message: (e as Error).message,
    });
  }
});

oauthRouter.get('/oauth/slack', async (req, res) => {
  try {
    const query = AuthorizationCodeQuery.parse(req.query);

    const to = await handleLogin({
      query,
      type: 'slack',
    });

    return res.redirect(to);
  } catch (e) {
    return res.status(500).json({
      message: (e as Error).message,
    });
  }
});

const AuthorizationCodeQuery = z.object({
  code: z.string().trim().min(1),
  state: z
    .string()
    .optional()
    .transform((value) => JSON.parse(value || '{}'))
    .transform((value) => OAuthCodeState.parse(value)),
});

type AuthorizationCodeQuery = z.infer<typeof AuthorizationCodeQuery>;

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
