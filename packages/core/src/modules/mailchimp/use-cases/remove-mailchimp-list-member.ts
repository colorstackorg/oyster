import mailchimp from '@mailchimp/mailchimp_marketing';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { ENV, IS_PRODUCTION } from '@/shared/env';
import { ErrorWithContext } from '@/shared/errors';
import {
  grabMailchimpConnection,
  releaseMailchimpConnection,
} from '../email-marketing.shared';

class RemoveListMemberError extends ErrorWithContext {
  message = 'Failed to remove list member.';
}

export async function removeMailchimpListMember({
  email,
}: GetBullJobData<'email_marketing.remove'>) {
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
