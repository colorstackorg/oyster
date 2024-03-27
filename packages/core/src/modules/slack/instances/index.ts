import { WebClient } from '@slack/web-api';

import { ENV } from '@/shared/env';

export const slack = new WebClient(ENV.SLACK_BOT_TOKEN);

export const internalSlack = new WebClient(ENV.INTERNAL_SLACK_BOT_TOKEN);
