import { match } from 'ts-pattern';

import { sleep } from '@oyster/utils';

import { MailchimpBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { redis } from '@/infrastructure/redis';
import { reportException } from '@/modules/sentry/use-cases/report-exception';
import { IS_PRODUCTION } from '@/shared/env';
import { encodeBasicAuthenticationToken } from '@/shared/utils/auth.utils';
import { fail, success } from '@/shared/utils/core.utils';

// Environment Variables

const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY as string;
const MAILCHIMP_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID as string;
const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX as string;

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
  MAILCHIMP_API_KEY
);

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

// "Add Mailchimp Member"

type AddMailchimpMemberInput = {
  email: string;
  firstName: string;
  lastName: string;
};

async function addMailchimpMember<T>({
  email,
  firstName,
  lastName,
}: AddMailchimpMemberInput) {
  if (!IS_PRODUCTION) {
    return success({ email, firstName, lastName });
  }

  await grabMailchimpConnection();

  const response = await fetch(MAILCHIMP_MEMBER_API_URL, {
    body: JSON.stringify({
      email_address: email,
      merge_fields: { FNAME: firstName, LNAME: lastName },
      status: 'subscribed',
      status_if_new: 'subscribed',
    }),
    method: 'POST',
    headers: {
      Authorization: `Basic ${MAILCHIMP_TOKEN}`,
    },
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

  return success({ email, firstName, lastName } as T);
}

// "Remove Mailchimp Member"

type RemoveMailchimpMemberInput = {
  email: string;
};

async function removeMailchimpMember({ email }: RemoveMailchimpMemberInput) {
  if (!IS_PRODUCTION) {
    return success({ email });
  }

  await grabMailchimpConnection();

  const response = await fetch(`${MAILCHIMP_MEMBER_API_URL}/${email}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${MAILCHIMP_TOKEN}`,
    },
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

  return success({ email });
}

// "Update Mailchimp Member"

type UpdateMailchimpMemberInput = {
  email: string;
  id: string;
};

async function updateMailchimpMember({
  email,
  id,
}: UpdateMailchimpMemberInput) {
  if (!IS_PRODUCTION) {
    return;
  }

  await grabMailchimpConnection();

  const response = await fetch(`${MAILCHIMP_MEMBER_API_URL}/${id}`, {
    body: JSON.stringify({ email_address: email }),
    method: 'PATCH',
    headers: {
      Authorization: `Basic ${MAILCHIMP_TOKEN}`,
    },
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

  return success({ email, id });
}

// Helpers

async function grabMailchimpConnection(): Promise<void> {
  while (true) {
    const connections = await redis.incr(MAILCHIMP_REDIS_KEY);

    if (connections <= MAILCHIMP_MAX_CONNECTIONS) {
      return;
    }

    await redis.decr(MAILCHIMP_REDIS_KEY);

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
    return match(job)
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
  }
);
