import { redis } from '@/infrastructure/redis';
import { OAuthTokenResponse } from '@/modules/authentication/oauth.service';
import { ColorStackError } from '@/shared/errors';
import { validate } from '@/shared/utils/zod.utils';

// Environment Variables

const API_URL = process.env.API_URL as string;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;

// Core

type UploadFileInput = {
  file: File;
  fileId?: string;
  fileName: string;
  folderId: string;
};

export async function uploadFileToGoogleDrive({
  file,
  fileId,
  fileName,
  folderId,
}: UploadFileInput) {
  const accessToken = await retrieveAccessToken();

  const isUpdate = !!fileId;

  const metadata = {
    mimeType: file.type,
    name: fileName,
    parents: !isUpdate && !!folderId ? [folderId] : undefined,
  };

  const form = new FormData();

  form.set(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );

  form.set('file', file);

  const response = await fetch(
    isUpdate
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      body: form,
      method: isUpdate ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const json = await response.json();

  if (!response.ok) {
    throw new ColorStackError()
      .withMessage('Failed to upload file to Google Drive.')
      .withContext({ fileId, metadata, response: json })
      .report();
  }

  return json.id as string;
}

// Authentication

async function retrieveAccessToken() {
  const [accessToken = '', expiresAt = '', refreshToken = ''] =
    await Promise.all([
      redis.get('google_drive:access_token'),
      redis.get('google_drive:expires_at'),
      redis.get('google_drive:refresh_token'),
    ]);

  if (!refreshToken) {
    throw new ColorStackError().withMessage(
      'Failed to find the Google Drive refresh token in Redis.'
    );
  }

  // We track the expiration time of the access token, so if it has yet to
  // expire, we can use it!
  if (!!expiresAt && Date.now() < parseInt(expiresAt)) {
    return accessToken;
  }

  // Otherwise, we need to refresh the access token.
  const newCredentials = await refreshCredentials(refreshToken);

  const newExpiresAt = Date.now() + newCredentials.expiresIn * 1000;

  await Promise.all([
    redis.set('google_drive:access_token', newCredentials.accessToken),
    redis.set('google_drive:expires_at', newExpiresAt),
  ]);

  return newCredentials.accessToken;
}

/**
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
 */
export async function saveGoogleDriveCredentials(code: string) {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: `${API_URL}/oauth/google/drive`,
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    body,
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const json = await response.json();

  if (!response.ok) {
    throw new ColorStackError()
      .withMessage('Failed to exchange code for Google Drive credentials.')
      .withContext(json);
  }

  const data = validate(
    OAuthTokenResponse.pick({
      access_token: true,
      expires_in: true,
      refresh_token: true,
    }),
    json
  );

  const expiresAt = Date.now() + data.expires_in * 1000;

  await Promise.all([
    redis.set('google_drive:access_token', data.access_token),
    redis.set('google_drive:expires_at', expiresAt),
    redis.set('google_drive:refresh_token', data.refresh_token),
  ]);
}

/**
 *
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#offline
 */
async function refreshCredentials(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const json = await response.json();

  if (!response.ok) {
    throw new ColorStackError()
      .withMessage('Failed to refresh Google Drive credentials.')
      .withContext(json);
  }

  const data = validate(
    OAuthTokenResponse.pick({
      access_token: true,
      expires_in: true,
    }),
    json
  );

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}
