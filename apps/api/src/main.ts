import './instrument';

import * as Sentry from '@sentry/bun';

import {
  airtableWorker,
  applicationWorker,
  eventWorker,
  feedWorker,
  gamificationWorker,
  mailchimpWorker,
  memberEmailWorker,
  memberWorker,
  notificationWorker,
  offerWorker,
  onboardingSessionWorker,
  oneTimeCodeWorker,
  opportunityWorker,
  peerHelpWorker,
  profileWorker,
  resumeReviewWorker,
  slackWorker,
} from '@oyster/core/api';

import {
  handleGoogleDriveOauth,
  handleGoogleOauth,
  handleSlackOauth,
} from './handlers/oauth';
import { handleSlackEvent, handleSlackShortcut } from './handlers/slack';
import { BunResponse } from './shared/bun-response';
import { ENV } from './shared/env';

bootstrap();

async function bootstrap() {
  startBullWorkers();

  const server = Bun.serve({
    port: ENV.PORT,
    routes: {
      '/health': new BunResponse('OK'),
      '/oauth/google': handleGoogleOauth,
      '/oauth/google/drive': handleGoogleDriveOauth,
      '/oauth/slack': handleSlackOauth,
      '/slack/events': { POST: handleSlackEvent },
      '/slack/shortcuts': { POST: handleSlackShortcut },
    },
    fetch() {
      return new BunResponse('Not Found', { status: 404 });
    },
    error(e) {
      Sentry.captureException(e);

      return BunResponse.json({ message: e.message }, { status: 500 });
    },
  });

  console.log(`API is running on port ${server.port}! 🚀`);
}

/**
 * Starts all Bull workers for various modules in the application.
 *
 * Each worker is responsible for processing jobs in its respective queue,
 * allowing for distributed and asynchronous task execution.
 */
function startBullWorkers(): void {
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
  peerHelpWorker.run();
  profileWorker.run();
  resumeReviewWorker.run();
  slackWorker.run();
}
