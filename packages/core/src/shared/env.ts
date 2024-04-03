import { config } from 'dotenv';

import { Environment } from './types';

// Loads the .env file into `process.env`. Note that if the config was already
// loaded (for example, in tests), this will not overwrite any existing values.
config();

export const ENV = {
  AIRMEET_ACCESS_KEY: process.env.AIRMEET_ACCESS_KEY as string,
  AIRMEET_SECRET_KEY: process.env.AIRMEET_SECRET_KEY as string,
  API_URL: process.env.API_URL as string,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID as string,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET as string,
  INTERNAL_SLACK_BOT_TOKEN: process.env.INTERNAL_SLACK_BOT_TOKEN as string,
  INTERNAL_SLACK_NOTIFICATIONS_CHANNEL_ID: process.env
    .INTERNAL_SLACK_NOTIFICATIONS_CHANNEL_ID as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  MAILCHIMP_API_KEY: process.env.MAILCHIMP_API_KEY as string,
  MAILCHIMP_AUDIENCE_ID: process.env.MAILCHIMP_AUDIENCE_ID as string,
  MAILCHIMP_SERVER_PREFIX: process.env.MAILCHIMP_SERVER_PREFIX as string,
  REDIS_URL: process.env.REDIS_URL as string,
  SENTRY_DSN: process.env.SENTRY_DSN as string,
  SLACK_ANNOUNCEMENTS_CHANNEL_ID: process.env
    .SLACK_ANNOUNCEMENTS_CHANNEL_ID as string,
  SLACK_ADMIN_TOKEN: process.env.SLACK_ADMIN_TOKEN as string,
  SLACK_BIRTHDAYS_CHANNEL_ID: process.env.SLACK_BIRTHDAYS_CHANNEL_ID as string,
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN as string,
  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID as string,
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET as string,
  SLACK_INTRODUCTIONS_CHANNEL_ID: process.env
    .SLACK_INTRODUCTIONS_CHANNEL_ID as string,
  SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET as string,
  STUDENT_PROFILE_URL: process.env.STUDENT_PROFILE_URL as string,
  SWAG_UP_CLIENT_ID: process.env.SWAG_UP_CLIENT_ID as string,
  SWAG_UP_CLIENT_SECRET: process.env.SWAG_UP_CLIENT_SECRET as string,
};

export const DATABASE_URL = process.env.DATABASE_URL as string;
export const ENVIRONMENT = process.env.ENVIRONMENT as Environment;
export const IS_PRODUCTION = ENVIRONMENT === 'production';
export const IS_TEST = ENVIRONMENT === 'test';
