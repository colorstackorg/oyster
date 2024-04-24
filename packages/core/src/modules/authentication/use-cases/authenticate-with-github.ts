import { z } from 'zod';

type AuthenticateWithGithubInput = {
  clientId: string;
  clientSecret: string;
  code: string;
};

const GithubOauthResponse = z.object({
  access_token: z.string().trim().min(1),
});

type GithubOauthResponse = z.infer<typeof GithubOauthResponse>;

/**
 * Authenticates with GitHub using the `code` received from the OAuth flow.
 * Returns the access token to be used with the GitHub API.
 *
 * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#2-users-are-redirected-back-to-your-site-by-github
 */
export async function authenticateWithGithub(
  input: AuthenticateWithGithubInput
): Promise<GithubOauthResponse> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    body: JSON.stringify({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
    }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'post',
  });

  const json = await response.json();
  const data = GithubOauthResponse.parse(json);

  return data;
}
