import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import {
  deleteObject,
  putObject,
  R2_PUBLIC_BUCKET_NAME,
  R2_PUBLIC_BUCKET_URL,
} from '@/infrastructure/s3';

type UploadProfilePictureInput = {
  memberId: string;
  pictureUrl: string;
};

/**
 * Uploads a profile picture to S3 and updates the member's profile picture in
 * the database. It first fetches the picture from the URL (either coming
 * from LinkedIn or Slack) and effecitvielly "copies" the contents to S3.
 *
 * @param input - The input for the upload profile picture use case.
 * @returns The updated member's profile picture.
 */
export async function uploadProfilePicture({
  memberId,
  pictureUrl,
}: UploadProfilePictureInput) {
  const member = await db
    .selectFrom('students')
    .select(['profilePicture', 'profilePictureKey'])
    .where('id', '=', memberId)
    .executeTakeFirst();

  if (!member) {
    return;
  }

  const response = await fetch(pictureUrl);

  if (!response.ok) {
    return;
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const contentType = response.headers.get('content-type');

  const extension = contentType?.includes('image/')
    ? contentType.split('/')[1]
    : null;

  const key = extension ? `members/${id()}.${extension}` : `members/${id()}`;

  await putObject({
    bucket: R2_PUBLIC_BUCKET_NAME,
    content: buffer,
    contentType: contentType || undefined,
    key,
  });

  await db
    .updateTable('students')
    .set({
      profilePicture: `${R2_PUBLIC_BUCKET_URL}/${key}`,
      profilePictureKey: key,
    })
    .where('id', '=', memberId)
    .execute();

  if (member.profilePictureKey) {
    await deleteObject({
      bucket: R2_PUBLIC_BUCKET_NAME,
      key: member.profilePictureKey,
    });
  }

  return {
    profilePicture: `${R2_PUBLIC_BUCKET_URL}/${key}`,
    profilePictureKey: key,
  };
}
