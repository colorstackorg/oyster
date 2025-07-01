import { type Transaction } from 'kysely';

import { type DB, db } from '@oyster/db';
import { id } from '@oyster/utils';

import { deleteObject, getPresignedURL, putObject } from '@/infrastructure/s3';

type UploadProfilePictureInput = {
  memberId: string;
  pictureUrl: string;
  trx?: Transaction<DB>;
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
  trx,
}: UploadProfilePictureInput) {
  return db.transaction().execute(async (_trx) => {
    trx = trx || _trx;

    const member = await trx
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

    const key = extension
      ? `members/${memberId}/${id()}.${extension}`
      : `members/${memberId}/${id()}`;

    await putObject({
      content: buffer,
      contentType: contentType || undefined,
      key,
    });

    // We're going to update member's profile picture presigned URL in the
    // database every 7 days, so we'll presign for the month just in case.
    const profilePictureUrl = await getPresignedURL({
      expiresIn: 60 * 60 * 24 * 30,
      key,
    });

    if (member.profilePictureKey) {
      await deleteObject({
        key: member.profilePictureKey,
      });
    }

    await trx
      .updateTable('students')
      .set({
        profilePicture: profilePictureUrl,
        profilePictureKey: key,
      })
      .where('id', '=', memberId)
      .execute();

    return {
      profilePicture: profilePictureUrl,
      profilePictureKey: key,
    };
  });
}
