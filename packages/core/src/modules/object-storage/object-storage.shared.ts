import { S3Client } from '@aws-sdk/client-s3';

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';

export const s3 = new S3Client({
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto',
});
