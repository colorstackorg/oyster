import { reportException } from '@/infrastructure/sentry';
import { encodeBasicAuthenticationToken } from '@/shared/utils/auth';
import { fail, type Result, success } from '@/shared/utils/core';

// Environment Variables

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID as string;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN as string;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER as string;

// Constants

const TWILIO_API_URL = 'https://api.twilio.com/2010-04-01';

const TWILIO_TOKEN = encodeBasicAuthenticationToken(
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN
);

// Core

type SendSMSInput = {
  message: string;

  /**
   * The phone number to send the SMS message to. Must be in E.164 format.
   *
   * @example '+18777804236'
   * @example '+18444351670'
   */
  phoneNumber: string;
};

/**
 * Sends an SMS message to a phone number using Twilio.
 *
 * @param input - The message and recipient phone number for the SMS message.
 * @returns A result indicating the success or failure of the SMS sending.
 *
 * @see https://www.twilio.com/docs/messaging/api/message-resource#send-an-sms-message
 */
export async function sendSMS({
  message,
  phoneNumber,
}: SendSMSInput): Promise<Result> {
  const form = new FormData();

  form.set('Body', message);
  form.set('From', TWILIO_PHONE_NUMBER);
  form.set('To', phoneNumber);

  const response = await fetch(
    TWILIO_API_URL + `/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      body: form,
      headers: { Authorization: `Basic ${TWILIO_TOKEN}` },
      method: 'POST',
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error('Failed to send SMS message with Twilio.');

    reportException(error, {
      data,
      status: response.status,
    });

    return fail({
      code: response.status,
      error: error.message,
    });
  }

  console.log('SMS message sent!', {
    phoneNumber,
    message,
  });

  return success({});
}
