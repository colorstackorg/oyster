import { config } from 'dotenv';

import { type Environment } from './types';

// Loads the .env file into `process.env`. Note that if the config was already
// loaded (for example, in tests), this will not overwrite any existing values.
config();

// These are environment-related variables.

export const ENVIRONMENT = process.env.ENVIRONMENT as Environment;
export const IS_DEVELOPMENT = ENVIRONMENT === 'development';
export const IS_PRODUCTION = ENVIRONMENT === 'production';
export const IS_TEST = ENVIRONMENT === 'test';

// These are shared variables that are used in multiple modules. Everything else
// above should be colocated with its respective module.

export const API_URL = process.env.API_URL as string;
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;
export const SLACK_ADMIN_TOKEN = process.env.SLACK_ADMIN_TOKEN as string;
export const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID as string;
export const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET as string;
export const STUDENT_PROFILE_URL = process.env.STUDENT_PROFILE_URL as string;
