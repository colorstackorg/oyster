import nodemailer from 'nodemailer';
import { ServerClient } from 'postmark';

export function getNodemailerTransporter() {
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
  const SMTP_USERNAME = process.env.SMTP_USERNAME;

  if (!SMTP_HOST || !SMTP_PASSWORD || !SMTP_USERNAME) {
    throw new Error('SMTP variables are not set, sending emails is disabled.');
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    secure: true,
    auth: {
      user: SMTP_USERNAME,
      pass: SMTP_PASSWORD,
    },
  });

  return transporter;
}

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
