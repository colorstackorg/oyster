import { db } from '@oyster/db';
import { MemberStatus } from '@oyster/types';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
import {
  AIRTABLE_FAMILY_BASE_ID,
  AIRTABLE_MEMBERS_TABLE_ID,
} from '@/modules/airtable';

export async function onMemberStatusUpdated({
  airtableId,
  email,
  firstName,
  sendViolationEmail,
  slackId,
  studentId,
  status,
}: GetBullJobData<'student.status_updated'>) {
  if (status === MemberStatus.BULK_REMOVED) {
    await onBulkRemoveStatusUpdate({
      airtableId,
      email,
      firstName,
      sendViolationEmail,
      slackId,
      studentId,
    });
  }

  if (status === MemberStatus.ACTIVE) {
    await onActiveStatusUpdate({
      airtableId,
      email,
      firstName,
      sendViolationEmail,
      slackId,
      studentId,
    });
  }

  if (status === MemberStatus.INACTIVE) {
    await onInactiveStatusUpdate({
      airtableId,
      email,
      firstName,
      sendViolationEmail,
      slackId,
      studentId,
    });
  }

  // TODO: Add other status updates here.
  //   if (status === MemberStatus.BANNED) {
  //     await onBannedStatusUpdate({
  //       airtableId,
  //       email,
  //       firstName,
  //       sendViolationEmail,
  //       slackId,
  //     });
  //   }
}

type StatusUpdateProps = {
  airtableId: string;
  email: string;
  firstName: string;
  sendViolationEmail: boolean;
  slackId?: string | null;
  studentId: string;
};

async function onBulkRemoveStatusUpdate({
  airtableId,
  email,
  firstName,
  sendViolationEmail,
  slackId,
}: StatusUpdateProps) {
  job('airtable.record.update', {
    airtableBaseId: AIRTABLE_FAMILY_BASE_ID!,
    airtableRecordId: airtableId,
    airtableTableId: AIRTABLE_MEMBERS_TABLE_ID!,
    data: {
      status: MemberStatus.BULK_REMOVED,
    },
  });

  job('mailchimp.remove', {
    email,
  });

  job('notification.slack.send', {
    message: `Member with the email "${email}" has been marked as bulk removed from ColorStack.`,
    workspace: 'internal',
  });

  if (slackId) {
    job('slack.deactivate', {
      slackId,
    });
  }

  if (sendViolationEmail) {
    job('notification.email.send', {
      to: email,
      name: 'student-removed',
      data: { firstName },
    });
  }
}

async function onActiveStatusUpdate({
  studentId,
  slackId,
  airtableId,
}: StatusUpdateProps) {
  const student = await db
    .selectFrom('students')
    .select(['email', 'firstName', 'id', 'lastName'])
    .where('id', '=', studentId)
    .executeTakeFirstOrThrow();

  job('airtable.record.update', {
    airtableBaseId: AIRTABLE_FAMILY_BASE_ID!,
    airtableRecordId: airtableId,
    airtableTableId: AIRTABLE_MEMBERS_TABLE_ID!,
    data: {
      status: MemberStatus.ACTIVE,
    },
  });

  job('student.engagement.backfill', {
    email: student.email,
    studentId: student.id,
  });

  job('mailchimp.add', {
    email: student.email,
    firstName: student.firstName,
    lastName: student.lastName,
  });

  if (slackId) {
    job('slack.activate', {
      slackId,
    });
  }
}

async function onInactiveStatusUpdate({
  airtableId,
  email,
  firstName,
  sendViolationEmail,
  slackId,
}: StatusUpdateProps) {
  job('airtable.record.update', {
    airtableBaseId: AIRTABLE_FAMILY_BASE_ID!,
    airtableRecordId: airtableId,
    airtableTableId: AIRTABLE_MEMBERS_TABLE_ID!,
    data: {
      status: MemberStatus.INACTIVE,
    },
  });

  job('mailchimp.remove', {
    email,
  });

  job('notification.slack.send', {
    message: `Member with the email "${email}" has been marked as inactive from ColorStack.`,
    workspace: 'internal',
  });

  if (slackId) {
    job('slack.deactivate', {
      slackId,
    });
  }

  if (sendViolationEmail) {
    job('notification.email.send', {
      to: email,
      name: 'student-removed',
      data: { firstName },
    });
  }
}

// async function onBannedStatusUpdate({
//   airtableId,
//   email,
//   firstName,
//   sendViolationEmail,
//   slackId,
// }: StatusUpdateProps) {
//   return;
// }
