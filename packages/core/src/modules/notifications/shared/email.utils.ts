import nodemailer from 'nodemailer';

export function getNodemailerTransporter() {
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
  const SMTP_USERNAME = process.env.SMTP_USERNAME;

  if (!SMTP_HOST || !SMTP_PASSWORD || !SMTP_USERNAME) {
    throw new Error(
      'SMTP variables are not set, so sending emails is disabled. Please see the "How to Enable Emails" guide for more help.'
    );
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
