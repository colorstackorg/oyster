import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

import { airtableWorker } from './modules/airtable';
import { applicationWorker } from './modules/applications/applications';
import { oneTimeCodeWorker } from './modules/authentication/one-time-code.worker';
import { offerWorker } from './modules/compensation/offers';
import { eventWorker } from './modules/events/events.worker';
import { feedWorker } from './modules/feed';
import { gamificationWorker } from './modules/gamification/gamification';
import { mailchimpWorker } from './modules/mailchimp';
import { memberEmailWorker } from './modules/members/member-emails.worker';
import { memberWorker } from './modules/members/members.worker';
import { profileWorker } from './modules/members/profile.worker';
import { notificationWorker } from './modules/notifications/notifications.worker';
import { onboardingSessionWorker } from './modules/onboarding-sessions/onboarding-sessions.worker';
import { opportunityWorker } from './modules/opportunities';
import { resumeReviewWorker } from './modules/resume-reviews';
import { slackWorker } from './modules/slack/slack.worker';

export { job } from './infrastructure/bull';
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
  mailchimpWorker.run();
  memberWorker.run();
  memberEmailWorker.run();
  notificationWorker.run();
  offerWorker.run();
  onboardingSessionWorker.run();
  oneTimeCodeWorker.run();
  opportunityWorker.run();
  profileWorker.run();
  resumeReviewWorker.run();
  slackWorker.run();
}
