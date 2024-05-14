import { GetObjectCommand } from '@aws-sdk/client-s3';

import {
  R2_BUCKET_NAME,
  s3,
} from '@/modules/object-storage/object-storage.shared';

type GetObjectInput = {
  bucket?: string;
  key: string;
};

export async function getObject(input: GetObjectInput) {
  const command = new GetObjectCommand({
    Bucket: input.bucket || R2_BUCKET_NAME,
    Key: input.key,
  });

  const output = await s3.send(command);

  const result = {
    base64: await output.Body?.transformToString('base64'),
    contentType: output.ContentType,
  };

  return result;
}
