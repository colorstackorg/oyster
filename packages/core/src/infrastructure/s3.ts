import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Environment Variables

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_BUCKET_NAME = process.env.R2_PUBLIC_BUCKET_NAME || '';
const R2_PUBLIC_BUCKET_URL = process.env.R2_PUBLIC_BUCKET_URL || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';

export { R2_PUBLIC_BUCKET_NAME, R2_PUBLIC_BUCKET_URL };

// Queries + Use Cases

// "Delete Object"

type DeleteObjectInput = {
  bucket?: string;
  key: string;
};

type DeleteObjectResult = void;

/**
 * Deletes the object stored in the specified bucket. If no bucket is specified,
 * the default bucket is used.
 *
 * @param input - Specifies the object to delete.
 */
export async function deleteObject(
  input: DeleteObjectInput
): Promise<DeleteObjectResult> {
  const command = new DeleteObjectCommand({
    Bucket: input.bucket || R2_BUCKET_NAME,
    Key: input.key,
  });

  await getClient().send(command);
}

// "Get Object"

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

// "Get Presigned URL"

type GetPresignedURLInput = {
  bucket?: string;

  /**
   * The number of seconds the presigned URL should be valid for. If not
   * specified, the default is 600 seconds (10 minutes).
   */
  expiresIn?: number;

  key: string;
};

type GetPresignedURLResult = string;

/**
 * Returns a presigned URL that can be used to access the object stored in the
 * S3-compatible bucket. If no bucket is specified, the default bucket is used.
 *
 * @param input - Specifies the object to get a presigned URL for.
 */
export async function getPresignedURL(
  input: GetPresignedURLInput
): Promise<GetPresignedURLResult> {
  const command = new GetObjectCommand({
    Bucket: input.bucket || R2_BUCKET_NAME,
    Key: input.key,
  });

  const client = getClient();

  const url = await getSignedUrl(client, command, {
    expiresIn: input.expiresIn || 600,
  });

  return url;
}

// "Put Object"

type PutObjectInput = {
  bucket?: string;
  content: Buffer;
  contentType: string;
  key: string;
};

type PutObjectResult = void;

/**
 * Uploads the object to the specified bucket. If no bucket is specified, the
 * default bucket is used.
 *
 * @param input - Specifies the object to upload and the location to upload to.
 */
export async function putObject(
  input: PutObjectInput
): Promise<PutObjectResult> {
  const command = new PutObjectCommand({
    Bucket: input.bucket || R2_BUCKET_NAME,
    Body: input.content,
    ContentType: input.contentType,
    Key: input.key,
  });

  await getClient().send(command);
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
