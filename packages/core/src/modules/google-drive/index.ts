import { redis } from '@/infrastructure/redis';
import { OAuthTokenResponse } from '@/modules/authentication/oauth.service';
import { ColorStackError } from '@/shared/errors';
import { validate } from '@/shared/utils/zod.utils';

// Environment Variables

const API_URL = process.env.API_URL as string;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;

// Core

type CreateFolderInput = {
  /**
   * The ID of the folder to create the folder in. If not provided, the folder
   * will be created in the root of the user's Google Drive.
   */
  folderId: string | null;

  /**
   * The name of the folder to create.
   *
   * @example "2024 Spring Resume Book"
   * @example "2023 Fall Resume Book"
   */
  name: string;
};

/**
 * Creates a folder in Google Drive. Returns the ID of the folder that was
 * created.
 *
 * @see https://developers.google.com/drive/api/guides/folder#create-folder
 */
export async function createGoogleDriveFolder({
  folderId,
  name,
}: CreateFolderInput) {
  const accessToken = await retrieveAccessToken();

  const body = JSON.stringify({
    mimeType: 'application/vnd.google-apps.folder',
    name,
    parents: folderId ? [folderId] : undefined,
  });

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    body,
    method: 'post',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const json = await response.json();

  if (!response.ok) {
    throw new ColorStackError()
      .withMessage('Failed to create a Google Drive folder.')
      .withContext({ folderId, name, response: json })
      .report();
  }

  return json.id;
}

type UploadFileInput = {
  /**
   * The file to upload to Google Drive, which is sent in a `multipart/form-data`
   * request.
   */
  file: File;

  /**
   * If provided, this is the ID of the file to update. This will send a `PATCH`
   * request instead of a `POST` request to the Google Drive API.
   */
  fileId?: string;

  /**
   * The name of the file to upload. If not provided, the file's original name
   * will be used.
   */
  fileName?: string;

  /**
   * The ID of the folder to upload the file to. If not provided, the file will
   * be uploaded to the root of the user's Google Drive.
   */
  folderId: string;
};

/**
 * Uploads a file to Google Drive. If a `fileId` is provided, this will update
 * the file instead of creating a new one.
 *
 * Returns the ID of the file that was uploaded.
 *
 * @see https://developers.google.com/drive/api/v3/manage-uploads
 */
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
    name: fileName || file.name,
    parents: !!folderId && !isUpdate ? [folderId] : undefined,
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

const ACCESS_TOKEN_KEY = 'google_drive:access_token';
const EXPIRES_AT_KEY = 'google_drive:expires_at';
const REFRESH_TOKEN_KEY = 'google_drive:refresh_token';

/**
 * Exchanges the authorization code for Google Drive credentials. Saves the
 * credentials in Redis.
 *
 * @see https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
 */
export async function saveGoogleDriveCredentials(code: string) {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: API_URL + '/oauth/google/drive',
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
    redis.set(ACCESS_TOKEN_KEY, data.access_token),
    redis.set(EXPIRES_AT_KEY, expiresAt),
    redis.set(REFRESH_TOKEN_KEY, data.refresh_token),
  ]);
}

async function retrieveAccessToken() {
  const [accessToken = '', expiresAt = '', refreshToken = ''] =
    await Promise.all([
      redis.get(ACCESS_TOKEN_KEY),
      redis.get(EXPIRES_AT_KEY),
      redis.get(REFRESH_TOKEN_KEY),
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
  const newAccessToken = await refreshCredentials(refreshToken);

  return newAccessToken;
}

/**
 * Refreshes the Google Drive credentials by using the refresh token. This
 * does NOT update the refresh token, which should never change unless the user
 * revokes access. Saves the updated credentials in Redis.
 *
 * Returns the new access token.
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
    body,
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const json = await response.json();

  if (!response.ok) {
    throw new ColorStackError()
      .withMessage('Failed to refresh Google Drive credentials.')
      .withContext(json)
      .report();
  }

  const data = validate(
    OAuthTokenResponse.pick({
      access_token: true,
      expires_in: true,
    }),
    json
  );

  const expiresAt = Date.now() + data.expires_in * 1000;

  await Promise.all([
    redis.set(ACCESS_TOKEN_KEY, data.access_token),
    redis.set(EXPIRES_AT_KEY, expiresAt),
  ]);

  return data.access_token;
}
