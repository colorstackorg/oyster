import { type JobsOptions } from 'bullmq';

import { reportException } from '@/modules/sentry/use-cases/report-exception';
import { QueueFromName } from '../bull';
import { BullJob, type BullQueue, type GetBullJobData } from '../bull.types';

export function job<JobName extends BullJob['name']>(
  name: JobName,
  data: GetBullJobData<JobName>,
  options?: JobsOptions
) {
  const result = BullJob.safeParse({
    data,
    name,
  });

  if (!result.success) {
    reportException(result.error);

    return;
  }

  const job = result.data;

  const queueName = QueueNameFromJobName[job.name];
  const queue = QueueFromName[queueName];

  queue.add(job.name, job.data, options).catch((e) => reportException(e));
}

const QueueNameFromJobName: Record<BullJob['name'], BullQueue> = {
  'airtable.record.create': 'airtable',
  'airtable.record.create.member': 'airtable',
  'airtable.record.delete': 'airtable',
  'airtable.record.update': 'airtable',
  'airtable.record.update.bulk': 'airtable',
  'application.review': 'application',
  'education.added': 'education_history',
  'education.deleted': 'education_history',
  'email_marketing.opened': 'email_marketing',
  'email_marketing.remove': 'email_marketing',
  'email_marketing.sync': 'email_marketing',
  'email_marketing.sync.daily': 'email_marketing',
  'email_marketing.sync.hourly': 'email_marketing',
  'email_marketing.sync.monthly': 'email_marketing',
  'email_marketing.sync.weekly': 'email_marketing',
  'email_marketing.sync.yearly': 'email_marketing',
  'event.attended': 'event',
  'event.recent.sync': 'event',
  'event.register': 'event',
  'event.registered': 'event',
  'event.sync': 'event',
  'feed.slack.recurring': 'feed',
  'gamification.activity.completed': 'gamification',
  'gamification.activity.completed.undo': 'gamification',
  'member_email.added': 'member_email',
  'member_email.primary.changed': 'member_email',
  'notification.email.send': 'notification',
  'notification.slack.send': 'notification',
  'onboarding_session.attended': 'onboarding_session',
  'one_time_code.expire': 'one_time_code',
  'profile.views.notification.monthly': 'profile',
  'slack.birthdates.update': 'slack',
  'slack.channel.archive': 'slack',
  'slack.channel.create': 'slack',
  'slack.channel.delete': 'slack',
  'slack.channel.rename': 'slack',
  'slack.channel.unarchive': 'slack',
  'slack.deactivate': 'slack',
  'slack.invite': 'slack',
  'slack.invited': 'slack',
  'slack.joined': 'slack',
  'slack.message.add': 'slack',
  'slack.message.added': 'slack',
  'slack.message.change': 'slack',
  'slack.message.delete': 'slack',
  'slack.profile_picture.changed': 'slack',
  'slack.reaction.add': 'slack',
  'slack.reaction.remove': 'slack',
  'student.activated': 'student',
  'student.activation_requirement_completed': 'student',
  'student.birthdate.daily': 'student',
  'student.created': 'student',
  'student.engagement.backfill': 'student',
  'student.points.recurring': 'student',
  'student.profile.viewed': 'student',
  'student.removed': 'student',
  'student.statuses.backfill': 'student',
  'student.statuses.new': 'student',
  'survey.responded': 'survey',
  'swag_pack.inventory.notify': 'swag_pack',
  'work_experience.added': 'work_history',
  'work_experience.deleted': 'work_history',
};
