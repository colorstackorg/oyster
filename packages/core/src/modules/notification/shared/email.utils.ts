import { ServerClient } from 'postmark';

export function getPostmarkInstance() {
  const POSTMARK_API_TOKEN = process.env.POSTMARK_API_TOKEN;

  if (!POSTMARK_API_TOKEN) {
    throw new Error(
      '"POSTMARK_API_TOKEN" is not set, sending emails is disabled.'
    );
  }

  const postmark = new ServerClient(POSTMARK_API_TOKEN);

  return postmark;
}
