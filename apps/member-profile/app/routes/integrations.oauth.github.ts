import { type LoaderFunctionArgs, redirect } from '@remix-run/node';

import { Route } from '@/shared/constants';
import { ENV } from '@/shared/constants.server';
import {
  authenticateWithGithub,
  getGithubProfile,
  reportException,
  updateMember,
} from '@/shared/core.server';
import { ErrorWithContext } from '@/shared/errors';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

// Note: This serves as a REST endpoint when authenticating with GitHub.

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { searchParams } = new URL(request.url);
  const { code } = Object.fromEntries(searchParams.entries());

  if (!code || !ENV.GITHUB_OAUTH_CLIENT_ID || !ENV.GITHUB_OAUTH_CLIENT_SECRET) {
    return redirect(Route['/profile/integrations']);
  }

  const memberId = user(session);

  try {
    const { accessToken } = await authenticateWithGithub({
      clientId: ENV.GITHUB_OAUTH_CLIENT_ID,
      clientSecret: ENV.GITHUB_OAUTH_CLIENT_SECRET,
      code,
    });

    const githubProfile = await getGithubProfile({ accessToken });

    await updateMember({
      data: {
        githubAccessToken: accessToken,
        githubConnectedAt: new Date(),
        githubId: githubProfile.id,
        githubUrl: githubProfile.url,
      },
      where: {
        id: memberId,
      },
    });
  } catch (e) {
    const error = new ErrorWithContext((e as Error).message).withContext({
      // TODO: Experiment with error codes in the future...maybe have a
      // centralized place for all error codes and their meanings.
      code: 'github_authentication_failed',
      memberId,
    });

    reportException(error);
  }

  return redirect(Route['/profile/integrations']);
}
