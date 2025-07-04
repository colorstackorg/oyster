import { z } from 'zod';

export type OAuthServiceType = 'google' | 'slack';

export type OAuthTokenRequest =
  | {
      code: string;
      grant_type: 'authorization_code';
      redirect_uri: string;
    }
  | {
      grant_type: 'refresh_token';
      refresh_token: string;
    };

export const OAuthTokenResponse = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
});

export type OAuthTokenResponse = z.infer<typeof OAuthTokenResponse>;

export type ExchangeCodeForTokenInput = {
  code: string;
  redirectUrl: string;
};

export type OAuthTokens = {
  accessToken: string;
};

export const OAuthProfile = z.object({
  email: z.string().email(),
});

export type OAuthProfile = z.infer<typeof OAuthProfile>;

export interface OAuthService {
  exchangeCodeForToken(args: ExchangeCodeForTokenInput): Promise<OAuthTokens>;
  getProfile(token: string): Promise<OAuthProfile>;
}
