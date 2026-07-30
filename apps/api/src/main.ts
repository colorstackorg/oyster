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
  handleLinkedInOauth,
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
      '/oauth/linkedin': handleLinkedInOauth,
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
 *
 * `run()` returns a promise that rejects if the worker's run loop dies. We
 * deliberately crash the process instead of swallowing that, because a worker
 * that quietly stops consuming looks completely healthy from the outside -- the
 * HTTP server keeps serving and keeps enqueueing, while its queue grows without
 * bound. Better to fail loudly and let the platform restart us.
 */
function startBullWorkers(): void {
  const workers = [
    airtableWorker,
    applicationWorker,
    eventWorker,
    feedWorker,
    gamificationWorker,
    mailchimpWorker,
    memberWorker,
    memberEmailWorker,
    notificationWorker,
    offerWorker,
    onboardingSessionWorker,
    oneTimeCodeWorker,
    opportunityWorker,
    peerHelpWorker,
    profileWorker,
    resumeReviewWorker,
    slackWorker,
  ];

  for (const worker of workers) {
    worker.run().catch((e) => {
      console.error(`The "${worker.name}" worker died!`, e);

      Sentry.captureException(e, { tags: { queue: worker.name } });
    });
  }

  console.log(`Started ${workers.length} Bull workers! 🐂`);
}
