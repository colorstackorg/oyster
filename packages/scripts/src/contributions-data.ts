import axios, { type AxiosResponse } from 'axios';

interface PullRequest {
  title: string;
  user: { login: string };
  merged_at: string | null;
}

interface User {
  name: string;
}

async function getMergedPullRequests(token: string): Promise<PullRequest[]> {
  const mergedPRs: PullRequest[] = [];
  let url: string | null =
    `https://api.github.com/repos/colorstackorg/oyster/pulls?state=closed`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };

  try {
    while (url) {
      const response: AxiosResponse = await axios.get(url, { headers });
      const prs: PullRequest[] = response.data;

      prs.forEach((pr) => {
        if (pr.merged_at) {
          mergedPRs.push(pr);
        }
      });

      url = response.headers['link']?.match(/<(.*?)>; rel="next"/)?.[1] || null;
    }
  } catch (error) {
    console.error('Failed to fetch merged pull requests:', error);
  }

  return mergedPRs;
}

async function fetchUserName(login: string, token: string): Promise<string> {
  const url = `https://api.github.com/users/${login}`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };

  try {
    const response = await axios.get(url, { headers });
    const user: User = response.data;

    return user.name ? `${login} (${user.name})` : login;
  } catch (error) {
    console.error('Failed to fetch user name:', error);

    return login;
  }
}

async function analyzePullRequests(
  prs: PullRequest[],
  token: string
): Promise<void> {
  const prefixes = ['feat', 'fix', 'chore'];
  const analysis: Record<string, number> = { feat: 0, fix: 0, chore: 0 };
  const authors: Record<string, Set<string>> = {
    feat: new Set(),
    fix: new Set(),
    chore: new Set(),
  };
  const totalAuthors = new Set<string>();

  for (const pr of prs) {
    const title = pr.title.trim();
    const authorLogin = pr.user.login;

    try {
      const authorName = await fetchUserName(authorLogin, token);
      const prefix = title.split(':')[0].trim().toLowerCase();

      if (prefixes.includes(prefix)) {
        if (!authors[prefix].has(authorName)) {
          analysis[prefix]++; // Increment only if the author is new for this prefix
        }

        authors[prefix].add(authorName);
      }

      totalAuthors.add(authorName);
    } catch (error) {
      console.error('Failed to fetch user name:', error);
    }
  }

  console.log('Pull Request Analysis:', analysis);
  prefixes.forEach((prefix) => {
    console.log(
      `Unique Contributors for ${prefix}: ${
        authors[prefix].size
      } - ${Array.from(authors[prefix]).join(', ')}`
    );
  });
  console.log('Total Contributors:', totalAuthors.size);
}

const token = ''; // Add GitHub token here

async function runPullRequestAnalysis() {
  const mergedPRs = await getMergedPullRequests(token);

  await analyzePullRequests(mergedPRs, token);
}

runPullRequestAnalysis();
