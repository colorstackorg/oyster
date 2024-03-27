import mailchimp from '@mailchimp/mailchimp_marketing';

import { ENV, IS_PRODUCTION } from '@/shared/env';
import { ErrorWithContext } from '@/shared/errors';
import {
  grabMailchimpConnection,
  releaseMailchimpConnection,
} from '../email-marketing.shared';

class AddListMemberError extends ErrorWithContext {
  message = 'Failed to add member to the list.';
}

type ListMember = {
  email: string;
  firstName: string;
  lastName: string;
};

export async function addMailchimpListMember({
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
