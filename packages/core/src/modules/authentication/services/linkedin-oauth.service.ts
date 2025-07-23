import z from 'zod';

import { reportException } from '@/infrastructure/sentry';
import { API_URL } from '@/shared/env';
import { type OAuthCodeState } from '../authentication.types';
import {
  type ExchangeCodeForTokenInput,
  OAuthProfile,
  OAuthTokenResponse,
} from '../oauth.service';

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID as string;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET as string;

export async function exchangeLinkedInCodeForToken(
  input: ExchangeCodeForTokenInput
) {
  const body = new URLSearchParams({
    client_id: LINKEDIN_CLIENT_ID,
    client_secret: LINKEDIN_CLIENT_SECRET,
    code: input.code,
    grant_type: 'authorization_code',
    redirect_uri: `${API_URL}/oauth/linkedin`,
  });

  const response = await fetch(
    'https://www.linkedin.com/oauth/v2/accessToken',
    {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  const json = await response.json();

  if (!response.ok) {
    const error = new Error('Failed to exchange LinkedIn code for token.');

    reportException(error, {
      json,
      status: response.status,
      statusText: response.statusText,
    });

    throw error;
  }

  const result = OAuthTokenResponse.pick({ access_token: true }).safeParse(
    json
  );

  if (!result.success) {
    const error = new Error('Failed to parse LinkedIn token response.');

    reportException(error, {
      json,
      status: response.status,
      statusText: response.statusText,
    });

    throw error;
  }

  return {
    accessToken: result.data.access_token,
  };
}

export async function getLinkedInTokenInfo(token: string) {
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await response.json();

  if (!response.ok) {
    const error = new Error('Failed to get LinkedIn token info.');

    reportException(error, {
      json,
      status: response.status,
      statusText: response.statusText,
    });

    throw error;
  }

  const result = OAuthProfile.extend({
    given_name: z.string().trim().min(1).optional(),
    family_name: z.string().trim().min(1).optional(),
  }).safeParse(json);

  if (!result.success) {
    const error = new Error('Failed to parse LinkedIn token info.');

    reportException(error, {
      json,
      status: response.status,
      statusText: response.statusText,
    });

    throw error;
  }

  return {
    email: result.data.email,
    firstName: result.data.given_name,
    lastName: result.data.family_name,
  };
}

/**
 * Used in the UI to redirect the user to the LinkedIn OAuth flow.
 *
 * The `API_URL` and `LINKEDIN_CLIENT_ID` are required to be set in the
 * environment variables.
 */
export function getLinkedInAuthUri({
  clientRedirectUrl,
}: Pick<OAuthCodeState, 'clientRedirectUrl'>) {
  if (!API_URL || !LINKEDIN_CLIENT_ID) {
    console.warn(
      '"LINKEDIN_CLIENT_ID" is not set, so login with LinkedIn is disabled.'
    );

    return null;
  }

  const state = {
    clientRedirectUrl,
    oauthRedirectUrl: `${API_URL}/oauth/linkedin`,
  };

  const url = new URL('https://www.linkedin.com/oauth/v2/authorization');

  url.searchParams.set('client_id', LINKEDIN_CLIENT_ID);
  url.searchParams.set('redirect_uri', state.oauthRedirectUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', JSON.stringify(state));

  return url.toString();
}
