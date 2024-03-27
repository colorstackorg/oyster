import mailchimp from '@mailchimp/mailchimp_marketing';

import { ENV, IS_PRODUCTION } from '@/shared/env';
import { ErrorWithContext } from '@/shared/errors';
import {
  grabMailchimpConnection,
  releaseMailchimpConnection,
} from '../email-marketing.shared';

class UpdateListMemberError extends ErrorWithContext {
  message = 'Failed to update list member.';
}

export async function updateMailchimpListMember({
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
