import { config } from 'dotenv';

import { type Environment } from './types';

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
  MEMBER_PROFILE_URL: process.env.MEMBER_PROFILE_URL as string,
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
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID as string, 
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER as string, 
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN as string,
};

// TODO: Below are the only variables that we need to process in the core,
// package and thus in this file after the dotenv has loaded the config.
// Everything else above should be colocated with its respective module.

export const ENVIRONMENT = process.env.ENVIRONMENT as Environment;
export const IS_DEVELOPMENT = ENVIRONMENT === 'development';
export const IS_PRODUCTION = ENVIRONMENT === 'production';
export const IS_TEST = ENVIRONMENT === 'test';
