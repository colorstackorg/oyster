import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { startBullWorkers } from '@oyster/core/api';

import { healthRouter } from './routers/health.router';
import { oauthRouter } from './routers/oauth.router';
import { slackEventRouter, slackShortcutsRouter } from './routers/slack.router';
import { ENV } from './shared/env';
import { type RawBodyRequest } from './shared/types';

bootstrap();

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

  app.use(express.json({ verify: populateRawBody }));
  app.use(bodyParser.urlencoded({ extended: true, verify: populateRawBody }));

  app.use(healthRouter);
  app.use(oauthRouter);
  app.use(slackEventRouter);
  app.use(slackShortcutsRouter);

  app.use(Sentry.Handlers.errorHandler());

  startBullWorkers();

  app.listen(ENV.PORT, () => {
    console.log('API is up and running! 🚀');
  });
}

const RAW_BODY_WHITELIST = ['/slack/events', '/slack/shortcuts'];

/**
 * Some API endpoints require access to the `req.rawBody` buffer field, which
 * is not available by default. We need to whitelist these endpoints so that
 * the raw body is available to them.
 *
 * This is common when verifying requests that come from 3rd party integrations.
 *
 * @param req - The request object.
 * @param _ - The response object.
 * @param buffer - The raw request body.
 */
function populateRawBody(
  req: RawBodyRequest,
  _: express.Response,
  buffer: Buffer
) {
  if (RAW_BODY_WHITELIST.includes(req.path)) {
    req.rawBody = buffer;
  }
}
