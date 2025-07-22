import { reportException } from '@/infrastructure/sentry';
import { API_URL } from '@/shared/env';
import {
  type ExchangeCodeForTokenInput,
  OAuthTokenResponse,
} from '../oauth.service';

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID as string;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET as string;

export async function exchangeLinkedinCodeForToken(
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

  console.log(json);

  return {
    accessToken: result.data.access_token,
  };
}

export async function getLinkedinProfile(token: string) {
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

  console.log(json);

  return {
    email: '',
  };
  // const result = OAuthProfile.safeParse(json);

  // if (!result.success) {
  //   const error = new Error('Failed to parse Google token info.');

  //   reportException(error, {
  //     json,
  //     status: response.status,
  //     statusText: response.statusText,
  //   });

  //   throw error;
  // }

  // return {
  //   email: result.data.email,
  // };
}
