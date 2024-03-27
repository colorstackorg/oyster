import { slack } from '@/modules/slack/instances';
import { ENV } from '@/shared/env';
import { ExchangeCodeForTokenInput, OAuthService } from '../oauth.service';

export class SlackOAuthService implements OAuthService {
  async exchangeCodeForToken(input: ExchangeCodeForTokenInput) {
    const { access_token, refresh_token } = await slack.openid.connect.token({
      client_id: ENV.SLACK_CLIENT_ID,
      client_secret: ENV.SLACK_CLIENT_SECRET,
      code: input.code,
      redirect_uri: input.redirectUrl,
    });

    return {
      accessToken: access_token || '',
      refreshToken: refresh_token || '',
    };
  }

  async getProfile(token: string) {
    const { email } = await slack.openid.connect.userInfo({
      token,
    });

    if (!email) {
      throw Error('Could not find Slack profile from token.');
    }

    return {
      email,
    };
  }
}
