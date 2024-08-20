import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import {
  airtableWorker,
  applicationWorker,
  educationWorker,
  emailMarketingWorker,
  eventWorker,
  feedWorker,
  gamificationWorker,
  memberEmailWorker,
  memberWorker,
  notificationWorker,
  onboardingSessionWorker,
  oneTimeCodeWorker,
  profileWorker,
  slackWorker,
  surveyWorker,
  swagPackWorker,
  workExperienceWorker,
} from '@oyster/core/api';

import { healthRouter } from './routers/health.router';
import { oauthRouter } from './routers/oauth.router';
import { slackEventRouter } from './routers/slack-event.router';
import { ENV } from './shared/env';
import { type RawBodyRequest } from './shared/types';

// Some API endpoints require access to the `req.rawBody` buffer field, which
// is not available by default. We need to whitelist these endpoints so that
// the raw body is available to them.
const RAW_BODY_WHITELIST = ['/slack/events'];

async function bootstrap() {
  const app = express();

  Sentry.init({
    dsn: ENV.SENTRY_DSN,
    enabled: ENV.ENVIRONMENT === 'production',
    environment: ENV.ENVIRONMENT,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
    ],
    tracesSampleRate: 0.25,
  });

  // According to the Sentry documentation, the request + tracing handlers need
  // to be applied before any other middleware.
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  app.use(cors({ credentials: true, origin: true }));
  app.use(helmet());

  app.use(
    express.json({
      verify: (req: RawBodyRequest, _, buffer) => {
        if (RAW_BODY_WHITELIST.includes(req.path)) {
          req.rawBody = buffer;
        }
      },
    })
  );

  app.use(healthRouter);
  app.use(oauthRouter);
  app.use(slackEventRouter);

  app.use(Sentry.Handlers.errorHandler());

  initializeBullWorkers();

  app.listen(ENV.PORT, () => {
    console.log('API is up and running! 🚀');
  });
}

function initializeBullWorkers() {
  airtableWorker.run();
  applicationWorker.run();
  educationWorker.run();
  emailMarketingWorker.run();
  eventWorker.run();
  feedWorker.run();
  gamificationWorker.run();
  memberWorker.run();
  memberEmailWorker.run();
  notificationWorker.run();
  onboardingSessionWorker.run();
  oneTimeCodeWorker.run();
  profileWorker.run();
  slackWorker.run();
  surveyWorker.run();
  swagPackWorker.run();
  workExperienceWorker.run();
}

bootstrap();
