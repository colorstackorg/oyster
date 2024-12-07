import { z } from 'zod';

import { job } from '@/infrastructure/bull';
import { redis } from '@/infrastructure/redis';
import { reportException } from '@/infrastructure/sentry';
import { ErrorWithContext, ZodParseError } from '@/shared/errors';
import { RateLimiter } from '@/shared/utils/rate-limiter';

const SlackResponse = z.object({
  error: z.string().optional(),
  ok: z.boolean(),
});

class DeactivateSlackUserError extends ErrorWithContext {
  message = 'Failed to deactivate Slack user.';
}

const deactivateRateLimiter = new RateLimiter('slack:connections:deactivate', {
  rateLimit: 20,
  rateLimitWindow: 60,
});

export async function deactivateSlackUser(id: string) {
  await deactivateRateLimiter.process();

  const response = await fetchFromSlack(
    'https://slack.com/api/users.admin.setInactive',
    { body: new URLSearchParams({ user: id }) }
  );

  const data = await response.json();

  const result = SlackResponse.safeParse(data);

  let error: Error | null = null;

  if (!result.success) {
    error = new ZodParseError(result.error);
  } else if (!result.data.ok) {
    error = new DeactivateSlackUserError().withContext({
      code: result.data.error,
    });
  }

  if (error) {
    reportException(error);
    throw error;
  }

  console.log({
    code: 'slack_user_deactivated',
    message: 'Slack user was deactivated.',
    data: { slackId: id },
  });
}

class InviteSlackUserError extends ErrorWithContext {
  message = 'Failed to invite Slack user.';
}

const inviteUserRateLimiter = new RateLimiter('slack:connections:invite_user', {
  rateLimit: 20,
  rateLimitWindow: 60,
});

export async function inviteSlackUser(email: string) {
  await inviteUserRateLimiter.process();

  const response = await fetchFromSlack(
    'https://slack.com/api/users.admin.invite',
    { body: new URLSearchParams({ email }) }
  );

  const data = await response.json();

  const result = SlackResponse.safeParse(data);

  let error: Error | null = null;

  if (!result.success) {
    error = new ZodParseError(result.error);
  } else if (!result.data.ok) {
    error = new InviteSlackUserError().withContext({
      code: result.data.error,
    });
  }

  if (error) {
    reportException(error);
    throw error;
  }

  job('slack.invited', {
    email,
  });

  console.log({
    code: 'slack_user_invited',
    message: 'User was invited to the Slack workspace.',
    data: { email },
  });
}

async function fetchFromSlack(
  url: string,
  { body }: { body: URLSearchParams }
) {
  const [cookie, token] = await Promise.all([
    redis.get('slack:legacy_cookie'),
    redis.get('slack:legacy_token'),
  ]);

  if (!cookie || !token) {
    throw new Error('Slack legacy token or cookie not found.');
  }

  body.set('token', token);

  const response = await fetch(url, {
    body,
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response;
}

//

/**
 * This is an undocumented API, which we have to use an xoxc- token, which
 * are only available via the web app.
 *
 * @see https://github.com/ErikKalkoken/slackApiDoc/blob/master/users.admin.invite.md
 * @see https://github.com/ErikKalkoken/slackApiDoc/blob/master/users.admin.setInactive.md
 * @see https://api.slack.com/web#basics
 * @see https://stackoverflow.com/questions/62759949/accessing-slack-api-with-chrome-authentication-token-xoxc/62777057#62777057
 */
