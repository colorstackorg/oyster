import { json, type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { ensureUserAuthenticated, user } from 'app/shared/session.server';
import { toast } from 'app/shared/session.server';

import { addGithub } from '@/member-profile.server';
import { GITHUB_API, GITHUB_TOKEN_URL, Route } from '../shared/constants';
import { ENV } from '../shared/constants.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);
  const id = user(session);

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  // to be used for differentiating which service we are getting calledback from
  const service = url.searchParams.get('service');

  if (code) {
    try {
      const bodyData = new FormData();

      bodyData.append('code', code);
      bodyData.append('client_id', ENV.GITHUB_OAUTH_CLIENT_ID);
      bodyData.append('client_secret', ENV.GITHUB_OAUTH_SECRET);
      const accessTokenRes = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        body: bodyData,
      });
      const responseString = await accessTokenRes.text();
      const searchParams = new URLSearchParams(responseString);
      const accessToken = searchParams.get('access_token');
      const userDataRes = await fetch(GITHUB_API, {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/json',
        },
      });
      const userData = await userDataRes.json();
      const githubId = userData.id;
      const githubUrl = userData.html_url;

      await addGithub(id, { githubId, githubUrl });
      toast(session, {
        message: 'Adding Github account!',
        type: 'success',
      });

      return redirect(Route['/profile/integrations']);
    } catch (e) {
      console.error(e);
    }
  }

  return redirect(Route['/profile/integrations']);
}
