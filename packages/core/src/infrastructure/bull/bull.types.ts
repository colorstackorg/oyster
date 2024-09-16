import { z } from 'zod';

import { EmailTemplate } from '@oyster/email-templates';
import {
  ActivationRequirement,
  Application,
  EmailCampaign,
  Event,
  type ExtractValue,
  ProfileView,
  Student,
  StudentEmail,
} from '@oyster/types';

import { OneTimeCode } from '@/modules/authentication/authentication.types';
import {
  ActivityType,
  CompletedActivity,
} from '@/modules/gamification/gamification.types';
import { OnboardingSession } from '@/modules/onboarding-session/onboarding-session.types';
import {
  SlackChannel,
  SlackMessage,
  SlackReaction,
} from '@/modules/slack/slack.types';
import { Survey } from '@/modules/survey/survey.types';

export const BullQueue = {
  AIRTABLE: 'airtable',
  APPLICATION: 'application',
  EMAIL_MARKETING: 'email_marketing',
  EVENT: 'event',
  FEED: 'feed',
  GAMIFICATION: 'gamification',
  MEMBER_EMAIL: 'member_email',
  NOTIFICATION: 'notification',
  ONBOARDING_SESSION: 'onboarding_session',
  ONE_TIME_CODE: 'one_time_code',
  PROFILE: 'profile',
  SLACK: 'slack',
  STUDENT: 'student',
  SWAG_PACK: 'swag_pack',
} as const;

export type BullQueue = ExtractValue<typeof BullQueue>;

export const AirtableBullJob = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('airtable.record.create'),
    data: z.object({
      airtableBaseId: z.string().trim().min(1),
      airtableTableId: z.string().trim().min(1),
      data: z.any(),
    }),
  }),
  z.object({
    name: z.literal('airtable.record.create.member'),
    data: z.object({
      studentId: Student.shape.id,
    }),
  }),
  z.object({
    name: z.literal('airtable.record.delete'),
    data: z.object({
      airtableBaseId: z.string().trim().min(1),
      airtableRecordId: z.string().trim().min(1),
      airtableTableId: z.string().trim().min(1),
    }),
  }),
  z.object({
    name: z.literal('airtable.record.update'),
    data: z.object({
      airtableBaseId: z.string().trim().min(1),
      airtableRecordId: z.string().trim().min(1),
      airtableTableId: z.string().trim().min(1),
      data: z.any(),
    }),
  }),
  z.object({
    name: z.literal('airtable.record.update.bulk'),
    data: z.object({
      airtableBaseId: z.string().trim().min(1),
      airtableTableId: z.string().trim().min(1),
      records: z.array(
        z.object({
          id: z.string().trim().min(1),
          data: z.any(),
        })
      ),
    }),
  }),
]);

export const ApplicationBullJob = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('application.review'),
    data: z.object({
      applicationId: Application.shape.id,
    }),
  }),
]);

export const EmailMarketingBullJob = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('email_marketing.opened'),
    data: z.object({
      studentId: Student.shape.id,
    }),
  }),
  z.object({
    name: z.literal('email_marketing.remove'),
    data: z.object({
      email: Student.shape.email,
    }),
  }),
  z.object({
    name: z.literal('email_marketing.sync'),
    data: z.object({
      campaignId: EmailCampaign.shape.id,
    }),
  }),
  z.object({
    name: z.literal('email_marketing.sync.hourly'),
    data: z.object({}),
  }),
  z.object({
    name: z.literal('email_marketing.sync.daily'),
    data: z.object({}),
  }),
  z.object({
    name: z.literal('email_marketing.sync.weekly'),
    data: z.object({}),
  }),
  z.object({
    name: z.literal('email_marketing.sync.monthly'),
    data: z.object({}),
  }),
  z.object({
    name: z.literal('email_marketing.sync.yearly'),
    data: z.object({}),
  }),
]);

export const EventBullJob = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('event.attended'),
    data: z.object({
      eventId: Event.shape.id,
      studentId: Student.shape.id,
    }),
  }),
  z.object({
    name: z.literal('event.register'),
    data: z.object({
      eventId: Event.shape.id,
      studentId: Student.shape.id,
    }),
  }),
  z.object({
    name: z.literal('event.registered'),
    data: z.object({
      eventId: Event.shape.id,
      studentId: Student.shape.id,
    }),
  }),
  z.object({
    name: z.literal('event.recent.sync'),
    data: z.object({}),
  }),
  z.object({
    name: z.literal('event.sync'),
    data: z.object({
      eventId: Event.shape.id,
    }),
  }),
]);

export const FeedBullJob = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('feed.slack.recurring'),
    data: z.object({}),
  }),
]);

export const GamificationBullJob = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('gamification.activity.completed'),
    data: z.discriminatedUnion('type', [
      z.object({
        eventId: Event.shape.id,
        studentId: CompletedActivity.shape.studentId,
        type: z.literal('attend_event'),
      }),
      z.object({
        studentId: CompletedActivity.shape.studentId,
        type: z.literal('get_activated'),
      }),
      z.object({
        resourceId: z.string().trim().min(1),
        studentId: CompletedActivity.shape.studentId,
        type: z.literal(ActivityType.GET_RESOURCE_UPVOTE),
        upvotedBy: z.string().trim().min(1),
      }),
      z.object({
        studentId: CompletedActivity.shape.studentId,
        type: z.literal(ActivityType.JOIN_MEMBER_DIRECTORY),
      }),
      z.object({
        description: z.string().trim().min(1),
        points: CompletedActivity.shape.points,
        studentId: CompletedActivity.shape.studentId,
        type: z.literal('one_off'),
      }),
      z.object({
        resourceId: z.string().trim().min(1),
        studentId: CompletedActivity.shape.studentId,
        type: z.literal(ActivityType.POST_RESOURCE),
      }),
      z.object({
        channelId: SlackMessage.shape.channelId,
        messageReactedTo: SlackMessage.shape.id,
        studentId: CompletedActivity.shape.studentId,
        type: z.literal('react_to_message'),
      }),
      z.object({
        referralId: z.string().trim().min(1),
        studentId: CompletedActivity.shape.studentId,
        type: z.literal(ActivityType.REFER_FRIEND),
      }),
      z.object({
        channelId: SlackMessage.shape.channelId,
        studentId: CompletedActivity.shape.studentId,
        threadRepliedTo: SlackMessage.shape.id,
        type: z.literal('reply_to_thread'),
      }),
      z.object({
        studentId: CompletedActivity.shape.studentId,
        surveyRespondedTo: Survey.shape.id,
        type: z.literal('respond_to_survey'),
      }),
      z.object({
        studentId: CompletedActivity.shape.studentId,
        type: z.literal(ActivityType.REVIEW_COMPANY),
        workExperienceId: z.string().trim().min(1),
      }),
      z.object({
        studentId: CompletedActivity.shape.studentId,
        type: z.literal('submit_census_response'),
        year: z.number().int().min(2024),
      }),
      z.object({
        resumeBookId: z.string().trim().min(1),
        studentId: CompletedActivity.shape.studentId,
        type: z.literal(ActivityType.SUBMIT_RESUME),
      }),
      z.object({
        studentId: CompletedActivity.shape.studentId,
        type: z.literal('update_education_history'),
      }),
      z.object({
        studentId: CompletedActivity.shape.studentId,
        type: z.literal('update_work_history'),
      }),
      z.object({
        studentId: CompletedActivity.shape.studentId,
        type: z.literal('upload_profile_picture'),
      }),
    ]),
  }),
  z.object({
    name: z.literal('gamification.activity.completed.undo'),
    data: z.discriminatedUnion('type', [
      z.object({
        resourceId: z.string().trim().min(1),
        studentId: CompletedActivity.shape.studentId,
        type: z.literal(ActivityType.GET_RESOURCE_UPVOTE),
        upvotedBy: z.string().trim().min(1),
      }),
      z.object({
        channelId: SlackMessage.shape.channelId,
        messageReactedTo: SlackMessage.shape.id,
        studentId: CompletedActivity.shape.studentId,
        type: z.literal('react_to_message'),
      }),
      z.object({
        channelId: SlackMessage.shape.channelId,
        studentId: CompletedActivity.shape.studentId,
        threadRepliedTo: SlackMessage.shape.id,
        type: z.literal('reply_to_thread'),
      }),
      z.object({
        studentId: CompletedActivity.shape.studentId,
        type: z.literal('update_education_history'),
      }),
      z.object({
        studentId: CompletedActivity.shape.studentId,
        type: z.literal('update_work_history'),
      }),
    ]),
  }),
]);

export const MemberEmailBullJob = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('member_email.added'),
    data: z.object({
      email: StudentEmail.shape.email,
      studentId: Student.shape.id,
    }),
  }),
  z.object({
    name: z.literal('member_email.primary.changed'),
    data: z.object({
      previousEmail: StudentEmail.shape.email,
      studentId: Student.shape.id,
    }),
  }),
]);

export const NotificationBullJob = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('notification.email.send'),
    data: EmailTemplate,
  }),
  z.object({
    name: z.literal('notification.slack.ephemeral.send'),
    data: z.object({
      channel: z.string().trim().min(1),
      text: z.string().trim().min(1),
      threadId: z.string().trim().min(1).optional(),
      userId: z.string().trim().min(1),
    }),
  }),
  z.object({
    name: z.literal('notification.slack.send'),
    data: z.discriminatedUnion('workspace', [
      z.object({
        channel: z.string().trim().min(1),
        message: z.string().trim().min(1),
        threadId: z.string().trim().min(1).optional(),
        workspace: z.literal('regular'),
      }),
      z.object({
        message: z.string().trim().min(1),
        threadId: z.string().trim().min(1).optional(),
        workspace: z.literal('internal'),
      }),
    ]),
  }),
]);

export const OnboardingSessionBullJob = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('onboarding_session.attended'),
    data: z.object({
      onboardingSessionId: OnboardingSession.shape.id,
      studentId: Student.shape.id,
    }),
  }),
]);

export const OneTimeCodeBullJob = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('one_time_code.expire'),
    data: z.object({
      oneTimeCodeId: OneTimeCode.shape.id,
    }),
  }),
]);

export const ProfileBullJob = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('profile.views.notification.monthly'),
    data: z.object({}),
  }),
]);

export const SlackBullJob = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('slack.birthdates.update'),
    data: z.object({}),
  }),
  z.object({
    name: z.literal('slack.channel.archive'),
    data: SlackChannel.pick({
      id: true,
    }),
  }),
  z.object({
    name: z.literal('slack.channel.create'),
    data: SlackChannel.pick({
      createdAt: true,
      id: true,
      name: true,
      type: true,
    }),
  }),
  z.object({
    name: z.literal('slack.channel.delete'),
    data: SlackChannel.pick({
      id: true,
    }),
  }),
  z.object({
    name: z.literal('slack.channel.rename'),
    data: SlackChannel.pick({
      id: true,
      name: true,
    }),
  }),
  z.object({
    name: z.literal('slack.channel.unarchive'),
    data: SlackChannel.pick({
      id: true,
    }),
  }),
  z.object({
    name: z.literal('slack.chatbot.message'),
    data: SlackMessage.pick({
      channelId: true,
      id: true,
      text: true,
      threadId: true,
      userId: true,
    }).required({ text: true }),
  }),
  z.object({
    name: z.literal('slack.deactivate'),
    data: z.object({
      slackId: Student.shape.slackId.unwrap(),
    }),
  }),
  z.object({
    name: z.literal('slack.invite'),
    data: z.object({
      email: Student.shape.email,
    }),
  }),
  z.object({
    name: z.literal('slack.invited'),
    data: z.object({
      email: Student.shape.email,
    }),
  }),
  z.object({
    name: z.literal('slack.joined'),
    data: z.object({
      email: Student.shape.email,
      slackId: Student.shape.slackId,
    }),
  }),
  z.object({
    name: z.literal('slack.message.add'),
    data: SlackMessage.pick({
      channelId: true,
      createdAt: true,
      id: true,
      studentId: true,
      text: true,
      threadId: true,
      userId: true,
    }),
  }),
  z.object({
    name: z.literal('slack.message.answer'),
    data: z.object({
      channelId: z.string().trim().min(1),
      text: z.string().trim().min(1),
      threadId: z.string().trim().min(1),
      userId: z.string().trim().min(1), // Slack user who triggered the action.
    }),
  }),
  z.object({
    name: z.literal('slack.message.change'),
    data: SlackMessage.pick({
      channelId: true,
      deletedAt: true,
      id: true,
      text: true,
    }),
  }),
  z.object({
    name: z.literal('slack.message.delete'),
    data: SlackMessage.pick({
      channelId: true,
      id: true,
    }),
  }),
  z.object({
    name: z.literal('slack.reaction.add'),
    data: SlackReaction.pick({
      channelId: true,
      messageId: true,
      reaction: true,
      userId: true,
    }),
  }),
  z.object({
    name: z.literal('slack.reaction.remove'),
    data: SlackReaction.pick({
      channelId: true,
      messageId: true,
      reaction: true,
      userId: true,
    }),
  }),
  z.object({
    name: z.literal('slack.profile_picture.changed'),
    data: z.object({
      profilePicture: Student.shape.profilePicture,
      slackId: Student.shape.slackId.unwrap(),
    }),
  }),
  z.object({
    name: z.literal('slack.thread.sync_embedding'),
    data: z.object({
      action: z.enum(['add', 'delete', 'update']),
      threadId: z.string().trim().min(1),
    }),
  }),
]);

export const StudentBullJob = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('student.activated'),
    data: z.object({
      studentId: Student.shape.id,
    }),
  }),
  z.object({
    name: z.literal('student.activation_requirement_completed'),
    data: z.object({
      requirement: z.nativeEnum(ActivationRequirement).optional(),
      studentId: Student.shape.id,
    }),
  }),
  z.object({
    name: z.literal('student.birthdate.daily'),
    data: z.object({}),
  }),
  z.object({
    name: z.literal('student.created'),
    data: z.object({
      studentId: Student.shape.id,
    }),
  }),
  z.object({
    name: z.literal('student.engagement.backfill'),
    data: z.object({
      email: Student.shape.email,
      studentId: Student.shape.id,
    }),
  }),
  z.object({
    name: z.literal('student.points.recurring'),
    data: z.object({}),
  }),
  z.object({
    name: z.literal('student.profile.viewed'),
    data: z.object({
      profileViewedId: ProfileView.shape.profileViewedId,
      viewerId: ProfileView.shape.viewerId,
    }),
  }),
  z.object({
    name: z.literal('student.removed'),
    data: z.object({
      airtableId: z.string().trim().min(1),
      email: Student.shape.email,
      firstName: z.string().trim().min(1),
      sendViolationEmail: z.boolean(),
      slackId: Student.shape.slackId.nullable(),
    }),
  }),
  z.object({
    name: z.literal('student.statuses.backfill'),
    data: z.object({
      studentId: Student.shape.id,
    }),
  }),
  z.object({
    name: z.literal('student.statuses.new'),
    data: z.object({}),
  }),
]);

export const SwagPackBullJob = z.discriminatedUnion('name', [
  z.object({
    name: z.literal('swag_pack.inventory.notify'),
    data: z.object({}),
  }),
]);

// Combination

export const BullJob = z.union([
  AirtableBullJob,
  ApplicationBullJob,
  EmailMarketingBullJob,
  EventBullJob,
  FeedBullJob,
  GamificationBullJob,
  MemberEmailBullJob,
  NotificationBullJob,
  OnboardingSessionBullJob,
  OneTimeCodeBullJob,
  ProfileBullJob,
  SlackBullJob,
  StudentBullJob,
  SwagPackBullJob,
]);

// Types

export type BullJob = z.infer<typeof BullJob>;

export type GetBullJobData<Name extends BullJob['name']> = Extract<
  BullJob,
  { name: Name }
>['data'];
