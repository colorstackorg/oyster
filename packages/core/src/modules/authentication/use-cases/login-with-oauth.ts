import { match } from 'ts-pattern';

import { db } from '@/infrastructure/database';
import { findMemberByEmail } from '@/modules/member/queries/find-member-by-email';
import { signToken } from '@/shared/utils/auth.utils';
import { OAuthCodeState } from '../authentication.types';
import { OAuthServiceType } from '../oauth.service';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { SlackOAuthService } from '../services/slack-oauth.service';

export type OAuthLoginInput = {
  context: NonNullable<OAuthCodeState['context']>;
  code: string;
  oauthRedirectUrl: OAuthCodeState['oauthRedirectUrl'];
  type: OAuthServiceType;
};

export type OuthLoginOutput = {
  authToken: string;
  email: string;
};

export async function loginWithOAuth(input: OAuthLoginInput) {
  const oauthService = match(input.type)
    .with('google', () => new GoogleOAuthService())
    .with('slack', () => new SlackOAuthService())
    .exhaustive();

  const { accessToken } = await oauthService.exchangeCodeForToken({
    code: input.code,
    redirectUrl: input.oauthRedirectUrl,
  });

  const { email } = await oauthService.getProfile(accessToken);

  let entity: { id: string } | null | undefined = null;

  if (input.context === 'admin_login') {
    entity = await db
      .selectFrom('admins')
      .select(['id'])
      .where('email', 'ilike', email)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  } else {
    entity = await findMemberByEmail(email).select(['id']).executeTakeFirst();
  }

  if (!entity) {
    return {
      authToken: '',
      email,
    };
  }

  const authToken = signToken({ id: entity.id }, { expiresIn: '1m' });

  return {
    authToken,
    email,
  };
}
