import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';
import { updateMailchimpListMember } from '@/modules/mailchimp/use-cases/update-mailchimp-list-member';
import { reportException } from '@/modules/sentry/use-cases/report-exception';
import { updateSlackEmail } from '@/modules/slack/services/slack-user.service';
import { NotFoundError } from '@/shared/errors';

type UpdateEmailMarketingMemberInput = {
  email: string;
  previousEmail: string;
};

type UpdateSlackUserInput = {
  email: string;
  slackId: string | null;
};

export async function onPrimaryEmailChanged({
  previousEmail,
  studentId,
}: GetBullJobData<'member_email.primary.changed'>) {
  const student = await db
    .selectFrom('students')
    .select(['email as newEmail', 'firstName', 'slackId'])
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
      slackId: student.slackId,
    }),
  ]);

  job('airtable.record.update', {
    newEmail: student.newEmail,
    previousEmail,
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
    const id = input.slackId;

    if (!id) {
      return;
    }

    await updateSlackEmail(id, input.email);
  } catch (e) {
    reportException(e);
  }
}
