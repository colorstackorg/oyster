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
  status,
}: GetBullJobData<'student.status_updated'>) {
  if (status === MemberStatus.BULK_REMOVED) {
    await onBulkRemoveStatusUpdate({
      airtableId,
      email,
      firstName,
      sendViolationEmail,
      slackId,
    });
  }

  // TODO: Add other status updates here.
  //   if (status === MemberStatus.ACTIVE) {
  //     await onActiveStatusUpdate({
  //       airtableId,
  //       email,
  //       firstName,
  //       sendViolationEmail,
  //       slackId,
  //     });
  //   }

  //   if (status === MemberStatus.INACTIVE) {
  //     await onInactiveStatusUpdate({
  //       airtableId,
  //       email,
  //       firstName,
  //       sendViolationEmail,
  //       slackId,
  //     });
  //   }

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
    message: `Member with the email "${email}" has been removed from ColorStack.`,
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

// async function onActiveStatusUpdate({
//   airtableId,
//   email,
//   firstName,
//   sendViolationEmail,
//   slackId,
// }: StatusUpdateProps) {
//   return;
// }

// async function onInactiveStatusUpdate({
//   airtableId,
//   email,
//   firstName,
//   sendViolationEmail,
//   slackId,
// }: StatusUpdateProps) {
//   return;
// }

// async function onBannedStatusUpdate({
//   airtableId,
//   email,
//   firstName,
//   sendViolationEmail,
//   slackId,
// }: StatusUpdateProps) {
//   return;
// }
