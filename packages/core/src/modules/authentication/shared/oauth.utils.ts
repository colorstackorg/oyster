import { type OAuthCodeState } from '../authentication.types';

type GetAuthUriInput = Pick<OAuthCodeState, 'clientRedirectUrl' | 'context'>;

export function getGoogleAuthUri({
  clientRedirectUrl,
  context,
}: GetAuthUriInput) {
  const API_URL = process.env.API_URL as string;
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;

  if (!API_URL || !GOOGLE_CLIENT_ID) {
    console.warn(
      '"GOOGLE_CLIENT_ID" is not set, so login with Google is disabled.'
    );

    return null;
  }

  const state: OAuthCodeState = {
    clientRedirectUrl,
    context,
    oauthRedirectUrl: `${API_URL}/oauth/google`,
  };

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');

  url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', state.oauthRedirectUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set(
    'scope',
    'https://www.googleapis.com/auth/userinfo.email'
  );
  url.searchParams.set('state', JSON.stringify(state));

  return url.toString();
}

export function getSlackAuthUri({
  clientRedirectUrl,
  context,
}: GetAuthUriInput) {
  const API_URL = process.env.API_URL as string;
  const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID as string;

  if (!API_URL || !SLACK_CLIENT_ID) {
    console.warn(
      '"SLACK_CLIENT_ID" is not set, so login with Slack is disabled.'
    );

    return null;
  }

  const state: OAuthCodeState = {
    clientRedirectUrl,
    context,
    oauthRedirectUrl: `${API_URL}/oauth/slack`,
  };

  const url = new URL('https://slack.com/openid/connect/authorize');

  url.searchParams.set('client_id', SLACK_CLIENT_ID);
  url.searchParams.set('redirect_uri', state.oauthRedirectUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', ['openid', 'profile', 'email'].join(' '));
  url.searchParams.set('state', JSON.stringify(state));

  return url.toString();
}
