import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

import { airtableWorker } from './modules/airtable/airtable.core';
import { applicationWorker } from './modules/application/application.core';
import { oneTimeCodeWorker } from './modules/authentication/one-time-code.worker';
import { jobOfferWorker } from './modules/compensation/job-offers';
import { eventWorker } from './modules/event/event.worker';
import { feedWorker } from './modules/feed/feed';
import { gamificationWorker } from './modules/gamification/gamification.core';
import { mailchimpWorker } from './modules/mailchimp/mailchimp';
import { memberEmailWorker } from './modules/member/member-email.worker';
import { memberWorker } from './modules/member/member.worker';
import { profileWorker } from './modules/member/profile.worker';
import { notificationWorker } from './modules/notification/notification.worker';
import { onboardingSessionWorker } from './modules/onboarding-session/onboarding-session.worker';
import { opportunityWorker } from './modules/opportunity/opportunity';
import { slackWorker } from './modules/slack/slack.worker';

export { job } from './infrastructure/bull/use-cases/job';
export { OAuthCodeState } from './modules/authentication/authentication.types';
export { loginWithOAuth } from './modules/authentication/use-cases/login-with-oauth';
export { saveGoogleDriveCredentials } from './modules/google-drive';
export { Environment } from './shared/types';

/**
 * Starts all Bull workers for various modules in the application.
 *
 * Each worker is responsible for processing jobs in its respective queue,
 * allowing for distributed and asynchronous task execution.
 */
export function startBullWorkers(): void {
  airtableWorker.run();
  applicationWorker.run();
  eventWorker.run();
  feedWorker.run();
  gamificationWorker.run();
  jobOfferWorker.run();
  mailchimpWorker.run();
  memberWorker.run();
  memberEmailWorker.run();
  notificationWorker.run();
  onboardingSessionWorker.run();
  oneTimeCodeWorker.run();
  opportunityWorker.run();
  profileWorker.run();
  slackWorker.run();
}
