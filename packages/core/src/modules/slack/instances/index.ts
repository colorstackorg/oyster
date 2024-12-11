import { WebClient } from '@slack/web-api';

// Environment Variables

const INTERNAL_SLACK_BOT_TOKEN = process.env.INTERNAL_SLACK_BOT_TOKEN;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

// Instances

export const internalSlack = new WebClient(INTERNAL_SLACK_BOT_TOKEN);
export const slack = new WebClient(SLACK_BOT_TOKEN);
