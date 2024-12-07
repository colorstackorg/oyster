import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
import { reportException } from '@/infrastructure/sentry';
import {
  AIRTABLE_FAMILY_BASE_ID,
  AIRTABLE_MEMBERS_TABLE_ID,
} from '@/modules/airtable/airtable';
import {
  getSlackUserByEmail,
  updateSlackEmail,
} from '@/modules/slack/services/slack-user.service';
import { ErrorWithContext, NotFoundError } from '@/shared/errors';

type UpdateSlackUserInput = {
  email: string;
  previousEmail: string;
  slackId: string | null;
};

export async function onPrimaryEmailChanged({
  previousEmail,
  studentId,
}: GetBullJobData<'member_email.primary.changed'>) {
  const student = await db
    .selectFrom('students')
    .select(['airtableId', 'email as newEmail', 'firstName', 'slackId'])
    .where('id', '=', studentId)
    .executeTakeFirst();

  if (!student) {
    throw new NotFoundError('Student could not be found.').withContext({
      id: studentId,
    });
  }

  await updateEmailOnSlack({
    email: student.newEmail,
    previousEmail,
    slackId: student.slackId,
  });

  job('mailchimp.update', {
    email: student.newEmail,
    id: previousEmail,
  });

  job('airtable.record.update', {
    airtableBaseId: AIRTABLE_FAMILY_BASE_ID!,
    airtableRecordId: student.airtableId!,
    airtableTableId: AIRTABLE_MEMBERS_TABLE_ID!,
    data: {
      Email: student.newEmail,
    },
  });

  const data = {
    firstName: student.firstName,
    newEmail: student.newEmail,
    previousEmail,
  };

  job('notification.email.send', {
    data,
    name: 'primary-email-changed',
    to: student.newEmail,
  });

  job('notification.email.send', {
    data,
    name: 'primary-email-changed',
    to: previousEmail,
  });
}

async function updateEmailOnSlack(input: UpdateSlackUserInput) {
  try {
    let id = input.slackId;

    if (!id) {
      // This is the case in which the member is trying to change their email
      // before they've accepted their Slack invitation. We'll attempt to find
      // their Slack account, which should be registered under their previous
      // email.
      const user = await getSlackUserByEmail(input.previousEmail);

      if (user) {
        id = user.id;
      } else {
        // If it's not found, there's not much we can do. We'll throw and
        // report to Sentry.
        throw new ErrorWithContext(
          'Failed to update Slack account email.'
        ).withContext({
          email: input.email,
          previousEmail: input.previousEmail,
        });
      }
    }

    await updateSlackEmail(id, input.email);
  } catch (e) {
    reportException(e);
  }
}
