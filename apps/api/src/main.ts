import './instrument';

import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

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

import { ENV } from './env';
import {
  handleGoogleDriveOauth,
  handleGoogleOauth,
  handleSlackOauth,
} from './handlers/oauth';
import { handleSlackEvent, handleSlackShortcut } from './handlers/slack';

bootstrap();

async function bootstrap() {
  const app = express();

  app.use(cors({ credentials: true, origin: true }));
  app.use(helmet());
  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  startBullWorkers();

  Bun.serve({
    port: ENV.PORT,
    routes: {
      '/health': new Response('OK'),
      '/oauth/google': handleGoogleOauth,
      '/oauth/google/drive': handleGoogleDriveOauth,
      '/oauth/slack': handleSlackOauth,
      '/slack/events': { POST: handleSlackEvent },
      '/slack/shortcuts': { POST: handleSlackShortcut },
    },
  });

  console.log('API is up and running! 🚀');
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
