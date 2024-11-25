import dayjs from 'dayjs';
import dedent from 'dedent';

import { db } from '@oyster/db';
import {
  ACTIVATION_REQUIREMENTS,
  type ActivationRequirement,
  type Student,
} from '@oyster/types';

import { job } from '@/infrastructure/bull/use-cases/job';
import { activateMember } from '@/modules/member/use-cases/activate-member';
import { ENV } from '@/shared/env';
import { ErrorWithContext } from '@/shared/errors';

type ActivationStepCompletedInput = {
  requirement?: ActivationRequirement;
  studentId: string;
};

// Helper Types

type ShouldProcessInput = Pick<
  Student,
  'acceptedAt' | 'activatedAt' | 'activationRequirementsCompleted'
> &
  Pick<ActivationStepCompletedInput, 'requirement'>;

type SendProgressNotificationInput = Pick<
  Student,
  'activationRequirementsCompleted' | 'firstName'
> & {
  slackId: NonNullable<Student['slackId']>;
};

export async function onActivationStepCompleted(
  event: ActivationStepCompletedInput
) {
  const { requirement, studentId } = event;

  const student = await db
    .selectFrom('students')
    .select([
      'acceptedAt',
      'activatedAt',
      'activationRequirementsCompleted',
      'firstName',
      'slackId',
    ])
    .where('id', '=', studentId)
    .executeTakeFirst();

  if (!student) {
    throw new ErrorWithContext('Student was not found.').withContext({
      id: studentId,
    });
  }

  const process = await shouldProcess({
    acceptedAt: student.acceptedAt,
    activationRequirementsCompleted:
      student.activationRequirementsCompleted as ActivationRequirement[],
    activatedAt: student.activatedAt || undefined,
    requirement,
  });

  if (!process) {
    return;
  }

  // We'll keep track of this to know if any new requirements were completed
  // or not.
  const previouslyCompletedRequirements =
    student.activationRequirementsCompleted;

  const updatedCompletedRequirements =
    await updateCompletedRequirements(studentId);

  const activated = ACTIVATION_REQUIREMENTS.every((requirement) => {
    return updatedCompletedRequirements.includes(requirement);
  });

  if (activated) {
    await activateMember(studentId);
  }

  const [newRequirementCompleted] = updatedCompletedRequirements.filter(
    (requirement) => {
      return !previouslyCompletedRequirements.includes(requirement);
    }
  );

  // This will be the case if this event was triggered by an action but
  // the student either already completed the requirement, or it's not
  // enough to satisfy the requirement (ie: sending 1 reply when 2 is
  // required).
  if (!newRequirementCompleted) {
    return;
  }

  if (student.slackId) {
    await sendProgressNotification({
      activationRequirementsCompleted: updatedCompletedRequirements,
      firstName: student.firstName,
      slackId: student.slackId,
    });
  }
}

async function shouldProcess({
  acceptedAt,
  activationRequirementsCompleted,
  activatedAt,
  requirement,
}: ShouldProcessInput) {
  // If the student already completed the requirement that we are looking
  // at, then we don't need to process them.
  if (activationRequirementsCompleted.includes(requirement!)) {
    return false;
  }

  if (activatedAt) {
    return false;
  }

  if (dayjs(acceptedAt).isBefore('2023-06-09')) {
    return false;
  }

  return true;
}

async function updateCompletedRequirements(studentId: string) {
  const updatedRequirements: ActivationRequirement[] = [];

  const [
    attendee,
    onboardingAttendee,
    introductionMessage,
    announcementReply,
    repliesCountResult,
  ] = await Promise.all([
    db
      .selectFrom('eventAttendees')
      .where('studentId', '=', studentId)
      .limit(1)
      .executeTakeFirst(),

    db
      .selectFrom('onboardingSessionAttendees')
      .select(['id'])
      .where('studentId', '=', studentId)
      .limit(1)
      .executeTakeFirst(),

    db
      .selectFrom('slackMessages')
      .where('channelId', '=', ENV.SLACK_INTRODUCTIONS_CHANNEL_ID)
      .where('threadId', 'is', null)
      .where('studentId', '=', studentId)
      .executeTakeFirst(),

    db
      .selectFrom('slackMessages')
      .where('channelId', '=', ENV.SLACK_ANNOUNCEMENTS_CHANNEL_ID)
      .where('threadId', 'is not', null)
      .where('studentId', '=', studentId)
      .executeTakeFirst(),

    db
      .selectFrom('slackMessages')
      .select((eb) => eb.fn.count<string>('threadId').distinct().as('count'))
      .where('threadId', 'is not', null)
      .where('studentId', '=', studentId)
      .executeTakeFirstOrThrow(),
  ]);

  if (attendee) {
    updatedRequirements.push('attend_event');
  }

  if (onboardingAttendee) {
    updatedRequirements.push('attend_onboarding');
  }

  if (announcementReply) {
    updatedRequirements.push('reply_to_announcement_message');
  }

  if (parseInt(repliesCountResult.count) >= 2) {
    updatedRequirements.push('reply_to_other_messages');
  }

  if (introductionMessage) {
    updatedRequirements.push('send_introduction_message');
  }

  await db
    .updateTable('students')
    .set({ activationRequirementsCompleted: updatedRequirements })
    .where('id', '=', studentId)
    .executeTakeFirstOrThrow();

  return updatedRequirements;
}

async function sendProgressNotification({
  activationRequirementsCompleted,
  firstName,
  slackId,
}: SendProgressNotificationInput) {
  const completedRequirements = activationRequirementsCompleted.length;

  const totalRequirements = ACTIVATION_REQUIREMENTS.length;

  let message: string;

  if (completedRequirements === totalRequirements) {
    message = dedent`
      Congratulations, ${firstName}! 🎉

      You've completed all of your activation requirements, which means...you are now an *activated* ColorStack member.

      Look out for an email that includes a GIFT CARD to the <https://colorstackmerch.org|*ColorStack Merch Store*>! 🎁
    `;
  } else {
    message = dedent`
      Hey, ${firstName}! 👋

      You're making some great progress on your activation! You've now completed ${completedRequirements}/${totalRequirements} requirements.

      See an updated checklist in your <https://app.colorstack.io/home/activation|*Member Profile*>! 👀
    `;
  }

  job('notification.slack.send', {
    channel: slackId,
    message,
    workspace: 'regular',
  });
}
