import { z } from 'zod';

type GetGithubProfileInput = {
  accessToken: string;
};

type GithubProfile = {
  id: number;
  url: string;
};

const GithubUserResponse = z.object({
  id: z.number(),
  html_url: z.string().url(),
});

/**
 * Fetches the GitHub profile of the authenticated user, using the access token
 * received from the OAuth flow.
 *
 * @see https://docs.github.com/en/rest/users/users#get-the-authenticated-user
 */
export async function getGithubProfile(
  input: GetGithubProfileInput
): Promise<GithubProfile> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${input.accessToken}`,
    },
  });

  const json = await response.json();
  const data = GithubUserResponse.parse(json);

  return {
    id: data.id,
    url: data.html_url,
  };
}
