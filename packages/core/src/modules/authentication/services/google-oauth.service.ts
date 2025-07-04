import { reportException } from '@/infrastructure/sentry';
import { API_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '@/shared/env';
import {
  type ExchangeCodeForTokenInput,
  OAuthProfile,
  type OAuthService,
  OAuthTokenResponse,
} from '../oauth.service';

export class GoogleOAuthService implements OAuthService {
  async exchangeCodeForToken(input: ExchangeCodeForTokenInput) {
    const body = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code: input.code,
      grant_type: 'authorization_code',
      redirect_uri: `${API_URL}/oauth/google`,
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const json = await response.json();

    if (!response.ok) {
      const error = new Error('Failed to exchange Google code for token.');

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
      const error = new Error('Failed to parse Google token response.');

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

  async getProfile(token: string) {
    const url = new URL('https://oauth2.googleapis.com/tokeninfo');

    url.searchParams.set('access_token', token);

    const response = await fetch(url);

    const json = await response.json();

    if (!response.ok) {
      const error = new Error('Failed to get Google token info.');

      reportException(error, {
        json,
        status: response.status,
        statusText: response.statusText,
      });

      throw error;
    }

    const result = OAuthProfile.safeParse(json);

    if (!result.success) {
      const error = new Error('Failed to parse Google token info.');

      reportException(error, {
        json,
        status: response.status,
        statusText: response.statusText,
      });

      throw error;
    }

    return {
      email: result.data.email,
    };
  }
}
