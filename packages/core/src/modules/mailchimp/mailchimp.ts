import { match } from 'ts-pattern';

import { sleep } from '@oyster/utils';

import { MailchimpBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { redis } from '@/infrastructure/redis';
import { reportException } from '@/modules/sentry/use-cases/report-exception';
import { IS_PRODUCTION } from '@/shared/env';
import { encodeBasicAuthenticationToken } from '@/shared/utils/auth.utils';
import { fail, type Result, success } from '@/shared/utils/core.utils';

// Environment Variables

const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
const MAILCHIMP_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;

// Constants

const MAILCHIMP_API_URL = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0`;
const MAILCHIMP_MEMBER_API_URL = `${MAILCHIMP_API_URL}/lists/${MAILCHIMP_AUDIENCE_ID}/members`;

/**
 * A base64 encoded string that is used to authenticate requests to the
 * Mailchimp API. The username can be any string here.
 *
 * @see https://mailchimp.com/developer/marketing/guides/quick-start/#generate-your-api-key
 */
const MAILCHIMP_TOKEN = encodeBasicAuthenticationToken(
  'user',
  MAILCHIMP_API_KEY as string
);

const MAILCHIMP_HEADERS = {
  Authorization: `Basic ${MAILCHIMP_TOKEN}`,
};

/**
 * This is the maximum number of concurrent connections that Mailchimp allows
 * per their API rate limiting documentation.
 *
 * @see https://mailchimp.com/developer/marketing/docs/fundamentals/#throttling
 */
const MAILCHIMP_MAX_CONNECTIONS = 10;

/**
 * The key used to track the number of concurrent connections to the Mailchimp
 * API.
 */
const MAILCHIMP_REDIS_KEY = 'mailchimp:connections';

// Core

type MailchimpMember = {
  email: string;
  firstName: string;
  id: string;
  lastName: string;
};

// "Add Mailchimp Member"

/**
 * Adds a member to the Mailchimp audience as a `subscribed` member.
 *
 * @see https://mailchimp.com/developer/marketing/api/list-members/add-member-to-list
 */
async function addMailchimpMember(
  input: Omit<MailchimpMember, 'id'>
): Promise<Result> {
  if (!IS_PRODUCTION) {
    return success({});
  }

  await grabMailchimpConnection();

  const response = await fetch(MAILCHIMP_MEMBER_API_URL, {
    body: JSON.stringify({
      email_address: input.email,
      merge_fields: { FNAME: input.firstName, LNAME: input.lastName },
      status: 'subscribed',
      status_if_new: 'subscribed',
    }),
    headers: MAILCHIMP_HEADERS,
    method: 'POST',
  });

  await releaseMailchimpConnection();

  const data = await response.json();

  if (!response.ok) {
    const error = new Error('Failed to update Mailchimp member.');

    reportException(error, {
      data,
      status: response.status,
    });

    return fail({
      code: response.status,
      error: error.message,
    });
  }

  return success({});
}

// "Remove Mailchimp Member"

/**
 * Removes (archives) a member from the Mailchimp audience.
 *
 * @see https://mailchimp.com/developer/marketing/api/list-members/archive-list-member
 */
async function removeMailchimpMember(
  input: Pick<MailchimpMember, 'email'>
): Promise<Result> {
  if (!IS_PRODUCTION) {
    return success({});
  }

  await grabMailchimpConnection();

  const response = await fetch(`${MAILCHIMP_MEMBER_API_URL}/${input.email}`, {
    headers: MAILCHIMP_HEADERS,
    method: 'DELETE',
  });

  await releaseMailchimpConnection();

  const data = await response.json();

  if (!response.ok) {
    const error = new Error('Failed to remove Mailchimp member.');

    reportException(error, {
      data,
      status: response.status,
    });

    return fail({
      code: response.status,
      error: error.message,
    });
  }

  return success({});
}

// "Update Mailchimp Member"

/**
 * Updates a member's email address.
 *
 * @see https://mailchimp.com/developer/marketing/api/list-members/update-list-member
 */
async function updateMailchimpMember(
  input: Pick<MailchimpMember, 'email' | 'id'>
): Promise<Result> {
  if (!IS_PRODUCTION) {
    return success({});
  }

  await grabMailchimpConnection();

  const response = await fetch(`${MAILCHIMP_MEMBER_API_URL}/${input.id}`, {
    body: JSON.stringify({ email_address: input.email }),
    headers: MAILCHIMP_HEADERS,
    method: 'PATCH',
  });

  await releaseMailchimpConnection();

  const data = await response.json();

  if (!response.ok) {
    const error = new Error('Failed to update Mailchimp member.');

    reportException(error, {
      data,
      status: response.status,
    });

    return fail({
      code: response.status,
      error: error.message,
    });
  }

  return success({});
}

// Helpers

async function grabMailchimpConnection(): Promise<void> {
  while (true) {
    const connections = await redis.incr(MAILCHIMP_REDIS_KEY);

    // If we have less than the maximum number of connections, we can return,
    // effectively "grabbing" the connection.
    if (connections <= MAILCHIMP_MAX_CONNECTIONS) {
      return;
    }

    // Otherwise, we need to release the connection and wait for a bit before
    // trying again.
    await releaseMailchimpConnection();

    await sleep(1000);
  }
}

async function releaseMailchimpConnection(): Promise<void> {
  await redis.decr(MAILCHIMP_REDIS_KEY);
}

// Worker

export const mailchimpWorker = registerWorker(
  'mailchimp',
  MailchimpBullJob,
  async (job) => {
    const result = await match(job)
      .with({ name: 'mailchimp.add' }, ({ data }) => {
        return addMailchimpMember(data);
      })
      .with({ name: 'mailchimp.remove' }, ({ data }) => {
        return removeMailchimpMember(data);
      })
      .with({ name: 'mailchimp.update' }, ({ data }) => {
        return updateMailchimpMember(data);
      })
      .exhaustive();

    if (!result.ok) {
      throw new Error(result.error);
    }

    return result.data;
  }
);
