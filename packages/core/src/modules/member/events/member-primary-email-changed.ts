import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';
import { updateMailchimpListMember } from '@/modules/mailchimp/use-cases/update-mailchimp-list-member';
import { reportException } from '@/modules/sentry/use-cases/report-exception';
import {
  getSlackUserByEmail,
  updateSlackEmail,
} from '@/modules/slack/services/slack-user.service';
import { ErrorWithContext, NotFoundError } from '@/shared/errors';

type UpdateEmailMarketingMemberInput = {
  email: string;
  previousEmail: string;
};

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

  await Promise.all([
    updateEmailMarketingMember({
      email: student.newEmail,
      previousEmail,
    }),

    updateEmailOnSlack({
      email: student.newEmail,
      previousEmail,
      slackId: student.slackId,
    }),
  ]);

  job('airtable.record.update', {
    airtableId: student.airtableId!,
    data: { email: student.newEmail },
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

async function updateEmailMarketingMember(
  input: UpdateEmailMarketingMemberInput
) {
  try {
    await updateMailchimpListMember({
      email: input.email,
      id: input.previousEmail,
    });
  } catch (e) {
    reportException(e);
  }
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
