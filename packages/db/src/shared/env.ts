import { config } from 'dotenv';

// Loads the .env file into `process.env`. Note that if the config was already
// loaded (for example, in tests), this will not overwrite any existing values.
config();

export const DATABASE_URL = process.env.DATABASE_URL as string;
export const ENVIRONMENT = process.env.ENVIRONMENT;
export const IS_PRODUCTION = ENVIRONMENT === 'production';
