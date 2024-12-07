import { match } from 'ts-pattern';
import { z } from 'zod';

import { ColorStackError } from '@/shared/errors';

// Environment Variables

const GITHUB_TOKEN = process.env.GITHUB_TOKEN as string;

// Types

const PullRequest = z.object({
  merged_at: z.coerce.date().nullable(),
  title: z.string().trim().min(1),
  user: z.object({ login: z.string().trim().min(1) }),
});

type PullRequest = z.infer<typeof PullRequest>;

// Core

/**
 * Returns high-level Oyster contributor statistics.
 *
 * For now, we're only interested in the number of unique contributors for
 * each type of contribution. We can expand this function to include more
 * detailed statistics in the future.
 */
export async function getOysterContributorStats() {
  const prs = await getMergedPullRequests();

  const choreContributors = new Set<string>();
  const docsContributors = new Set<string>();
  const featContributors = new Set<string>();
  const fixContributors = new Set<string>();
  const totalContributors = new Set<string>();

  for (const pr of prs) {
    const username = pr.user.login;

    totalContributors.add(username);

    const title = pr.title.trim();
    const prefix = title.split(':')[0].trim().toLowerCase();

    match(prefix)
      .with('chore', () => choreContributors.add(username))
      .with('docs', () => docsContributors.add(username))
      .with('feat', () => featContributors.add(username))
      .with('fix', () => fixContributors.add(username))
      .otherwise(() => {});
  }

  return {
    totalContributors: totalContributors.size,
    uniqueContributorsChore: choreContributors.size,
    uniqueContributorsDocs: docsContributors.size,
    uniqueContributorsFix: fixContributors.size,
    uniqueContributorsFeature: featContributors.size,
  };
}

/**
 * Returns the merged pull requests for the Oyster repository.
 *
 * The GitHub API paginates the results, so we need to follow the `next` link
 * in the response headers to fetch all the pull requests. See documentation
 * below.
 *
 * @see https://docs.github.com/en/rest/pulls/pulls#list-pull-requests
 * @see https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api#using-link-headers
 */
async function getMergedPullRequests(): Promise<PullRequest[]> {
  const result: PullRequest[] = [];

  let uri =
    'https://api.github.com/repos/colorstackorg/oyster/pulls?state=closed&per_page=100';

  while (uri) {
    const response = await fetch(uri, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${GITHUB_TOKEN}`,
      },
    });

    const json = await response.json();

    if (!response.ok) {
      throw new ColorStackError()
        .withMessage('Failed to fetch merged pull requests.')
        .withContext({ response: json })
        .report();
    }

    const prs = PullRequest.array().parse(json);

    prs.forEach((pr) => {
      if (pr.merged_at) {
        result.push(pr);
      }
    });

    const link = response.headers.get('link');

    if (link) {
      uri = link.match(/<(.*?)>; rel="next"/)?.[1] as string;
    } else {
      uri = '';
    }
  }

  return result;
}
