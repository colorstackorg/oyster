import { z } from 'zod';

import { reportException } from '@/infrastructure/sentry';

// Environment Variables

const POSTMARK_API_TOKEN = process.env.POSTMARK_API_TOKEN;
const POSTMARK_API_URL = 'https://api.postmarkapp.com';

// Core

type PostmarkAttachment = {
  Content: string;
  ContentType: string;
  Name: string;
};

type SendEmailInput = {
  Attachments?: Array<PostmarkAttachment>;
  From: string;
  HtmlBody: string;
  ReplyTo: string;
  Subject: string;
  To: string;
};

/**
 * Sends an email using Postmark.
 *
 * @param input - The input to send the email with.
 *
 * @see https://postmarkapp.com/developer/api/email-api#send-a-single-email
 */
export async function sendEmail(input: SendEmailInput) {
  if (!POSTMARK_API_TOKEN) {
    console.warn('POSTMARK_API_TOKEN is not set, skipping email send.');

    return;
  }

  const response = await fetch(`${POSTMARK_API_URL}/email`, {
    method: 'POST',
    body: JSON.stringify(input),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': POSTMARK_API_TOKEN,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    reportException(
      new Error(`Failed to send Postmark email to "${input.To}".`),
      {
        data,
        input,
        status: response.status,
        statusText: response.statusText,
      }
    );

    return;
  }
}

/**
 * Returns `true` if the email has bounced at least once on Postmark.
 *
 *
 * @param email - The email to check.
 * @returns Whether the email has bounced at least once on Postmark.
 *
 * @see https://postmarkapp.com/developer/api/bounce-api#bounces
 */
export async function hasEmailBounced(email: string): Promise<boolean> {
  if (!POSTMARK_API_TOKEN) {
    console.warn('POSTMARK_API_TOKEN is not set, returning false as fallback.');

    return false;
  }

  const url = new URL(`${POSTMARK_API_URL}/bounces`);

  url.searchParams.set('count', '1');
  url.searchParams.set('emailFilter', email);
  url.searchParams.set('inactive', 'true');
  url.searchParams.set('offset', '0');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'X-Postmark-Server-Token': POSTMARK_API_TOKEN,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    reportException(
      new Error(`Failed to get bounces for ${email}: ${response.statusText}`),
      data
    );

    return false;
  }

  const parseResult = z.object({ TotalCount: z.number() }).safeParse(data);

  if (!parseResult.success) {
    reportException(
      new Error(`Failed to parse bounces for ${email}: ${response.statusText}`),
      data
    );

    return false;
  }

  return parseResult.data.TotalCount >= 1;
}
