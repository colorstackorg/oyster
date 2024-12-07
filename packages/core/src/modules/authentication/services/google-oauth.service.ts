import { type OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

import { API_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '@/shared/env';
import {
  type ExchangeCodeForTokenInput,
  type OAuthService,
} from '../oauth.service';

export class GoogleOAuthService implements OAuthService {
  private client: OAuth2Client;

  constructor() {
    this.client = new google.auth.OAuth2({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      redirectUri: `${API_URL}/oauth/google`,
    });
  }

  async exchangeCodeForToken(input: ExchangeCodeForTokenInput) {
    const { tokens } = await this.client.getToken(input.code);

    return {
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
    };
  }

  async getProfile(token: string) {
    const { email = '' } = await this.client.getTokenInfo(token);

    if (!email) {
      throw Error('Could not find Google profile from token.');
    }

    return {
      email,
    };
  }
}
