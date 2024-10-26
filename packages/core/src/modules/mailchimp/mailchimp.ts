import mailchimp from '@mailchimp/mailchimp_marketing';
import { match } from 'ts-pattern';

import { sleep } from '@oyster/utils';

import {
  type GetBullJobData,
  MailchimpBullJob,
} from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { redis, RedisKey } from '@/infrastructure/redis';
import { ENV, IS_PRODUCTION } from '@/shared/env';
import { ErrorWithContext } from '@/shared/errors';

mailchimp.setConfig({
  apiKey: ENV.MAILCHIMP_API_KEY,
  server: ENV.MAILCHIMP_SERVER_PREFIX,
});

/**
 * This is the maximum number of concurrent connections that Mailchimp allows
 * per their API rate limiting documentation.
 *
 * @see https://mailchimp.com/developer/marketing/docs/fundamentals/#throttling
 */
const MAX_MAILCHIMP_CONNECTIONS = 10;

async function grabMailchimpConnection() {
  while (true) {
    const connections = await redis.incr(RedisKey.MAILCHIMP_CONNECTIONS);

    if (connections <= MAX_MAILCHIMP_CONNECTIONS) {
      return;
    }

    await redis.decr(RedisKey.MAILCHIMP_CONNECTIONS);

    await sleep(1000);
  }
}

async function releaseMailchimpConnection() {
  await redis.decr(RedisKey.MAILCHIMP_CONNECTIONS);
}

class RemoveListMemberError extends ErrorWithContext {
  message = 'Failed to remove list member.';
}

async function removeMailchimpListMember({
  email,
}: GetBullJobData<'mailchimp.remove'>) {
  if (!IS_PRODUCTION) {
    return;
  }

  await grabMailchimpConnection();

  try {
    await mailchimp.lists.deleteListMember(ENV.MAILCHIMP_AUDIENCE_ID, email);
  } catch (e) {
    throw new RemoveListMemberError().withContext({ email });
  } finally {
    await releaseMailchimpConnection();
  }
}

class UpdateListMemberError extends ErrorWithContext {
  message = 'Failed to update list member.';
}

async function updateMailchimpListMember({
  email,
  id,
}: {
  email: string;
  id: string;
}) {
  if (!IS_PRODUCTION) {
    return;
  }

  await grabMailchimpConnection();

  try {
    await mailchimp.lists.updateListMember(ENV.MAILCHIMP_AUDIENCE_ID, id, {
      email_address: email,
    });
  } catch (e) {
    throw new UpdateListMemberError().withContext({
      newEmail: email,
      oldEmail: id,
    });
  } finally {
    await releaseMailchimpConnection();
  }
}

class AddListMemberError extends ErrorWithContext {
  message = 'Failed to add member to the list.';
}

type ListMember = {
  email: string;
  firstName: string;
  lastName: string;
};

async function addMailchimpListMember({
  email,
  firstName,
  lastName,
}: ListMember) {
  if (!IS_PRODUCTION) {
    return;
  }

  await grabMailchimpConnection();

  try {
    // This is a `PUT` call, so it will either add the member to the list,
    // or it will update the member if they already exist.
    await mailchimp.lists.setListMember(ENV.MAILCHIMP_AUDIENCE_ID, email, {
      email_address: email,
      merge_fields: {
        FNAME: firstName,
        LNAME: lastName,
      },
      status: 'subscribed',
      status_if_new: 'subscribed',
    });
  } catch (e) {
    throw new AddListMemberError().withContext({
      email: email,
    });
  } finally {
    await releaseMailchimpConnection();
  }
}

// Worker

export const mailchimpWorker = registerWorker(
  'mailchimp',
  MailchimpBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'mailchimp.add' }, ({ data }) => {
        return addMailchimpListMember(data);
      })
      .with({ name: 'mailchimp.remove' }, ({ data }) => {
        return removeMailchimpListMember(data);
      })
      .with({ name: 'mailchimp.update' }, ({ data }) => {
        return updateMailchimpListMember(data);
      })
      .exhaustive();
  }
);
