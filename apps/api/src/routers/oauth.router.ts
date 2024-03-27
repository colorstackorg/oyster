import express from 'express';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { loginWithOAuth, OAuthCodeState } from '@colorstack/core/api';

export const oauthRouter = express.Router();

oauthRouter.get('/oauth/google', async (req, res) => {
  const query = AuthorizationCodeQuery.parse(req.query);

  try {
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

oauthRouter.get('/oauth/slack', async (req, res) => {
  const query = AuthorizationCodeQuery.parse(req.query);

  try {
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
