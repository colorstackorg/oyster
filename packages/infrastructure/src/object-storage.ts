import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Environment Variables

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';

// Queries + Use Cases

type GetObjectInput = {
  bucket?: string;
  key: string;
};

type GetObjectResult = {
  base64: string | undefined;
  contentType: string | undefined;
};

/**
 * Returns the object stored in the specified bucket. If no bucket is specified,
 * the default bucket is used.
 *
 * @param input - Specifies where to look for the object.
 */
export async function getObject(
  input: GetObjectInput
): Promise<GetObjectResult> {
  const command = new GetObjectCommand({
    Bucket: input.bucket || R2_BUCKET_NAME,
    Key: input.key,
  });

  const output = await getClient().send(command);

  const result = {
    base64: await output.Body?.transformToString('base64'),
    contentType: output.ContentType,
  };

  return result;
}

// Helpers

function getClient() {
  return new S3Client({
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: 'auto',
  });
}
