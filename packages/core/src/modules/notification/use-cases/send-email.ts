import { render } from '@react-email/render';
import { match } from 'ts-pattern';

import {
  ApplicationAcceptedEmail,
  ApplicationCreatedEmail,
  ApplicationRejectedEmail,
  EmailTemplate,
  OneTimeCodeSentEmail,
  PrimaryEmailChangedEmail,
  StudentActivatedEmail,
  StudentAttendedOnboardingEmail,
  StudentRemovedEmail,
} from '@oyster/email-templates';

import { ENV } from '@/shared/env';
import { Environment } from '@/shared/types';
import {
  getNodemailerTransporter,
  getPostmarkInstance,
} from '../shared/email.utils';

export async function sendEmail(input: EmailTemplate) {
  return match(ENV.ENVIRONMENT)
    .with('development', () => {
      return sendEmailInDevelopment(input);
    })
    .with('production', () => {
      return sendEmailInProduction(input);
    })
    .with('test', () => {
      // We don't want to send emails in test environment...
    })
    .exhaustive();
}

async function sendEmailInProduction(input: EmailTemplate) {
  const postmark = getPostmarkInstance();

  await postmark.sendEmail({
    From: getFrom(input),
    HtmlBody: getHtml(input),
    ReplyTo: getReplyTo(input),
    Subject: getSubject(input),
    To: input.to,
  });
}

async function sendEmailInDevelopment(input: EmailTemplate) {
  const transporter = getNodemailerTransporter();

  await transporter.sendMail({
    // from: getFrom(input),
    html: getHtml(input),
    subject: getSubject(input),
    to: input.to,
  });
}

function getFrom(input: EmailTemplate): string {
  const FROM_JEHRON = 'Jehron Petty <jehron@colorstack.org>';
  const FROM_NOTIFICATIONS = 'ColorStack <notifications@colorstack.org>';

  return match(input.name)
    .with('application-accepted', () => FROM_JEHRON)
    .with('application-created', () => FROM_NOTIFICATIONS)
    .with('application-rejected', () => FROM_NOTIFICATIONS)
    .with('one-time-code-sent', () => FROM_NOTIFICATIONS)
    .with('primary-email-changed', () => FROM_NOTIFICATIONS)
    .with('student-activated', () => FROM_NOTIFICATIONS)
    .with('student-attended-onboarding', () => FROM_NOTIFICATIONS)
    .with('student-removed', () => FROM_NOTIFICATIONS)
    .exhaustive();
}

function getHtml(input: EmailTemplate): string {
  const element = match(input)
    .with({ name: 'application-accepted' }, ({ data }) => {
      return ApplicationAcceptedEmail(data);
    })
    .with({ name: 'application-created' }, ({ data }) => {
      return ApplicationCreatedEmail(data);
    })
    .with({ name: 'application-rejected' }, ({ data }) => {
      return ApplicationRejectedEmail(data);
    })
    .with({ name: 'one-time-code-sent' }, ({ data }) => {
      return OneTimeCodeSentEmail(data);
    })
    .with({ name: 'primary-email-changed' }, ({ data }) => {
      return PrimaryEmailChangedEmail(data);
    })
    .with({ name: 'student-activated' }, ({ data }) => {
      return StudentActivatedEmail(data);
    })
    .with({ name: 'student-attended-onboarding' }, ({ data }) => {
      return StudentAttendedOnboardingEmail(data);
    })
    .with({ name: 'student-removed' }, ({ data }) => {
      return StudentRemovedEmail(data);
    })
    .exhaustive();

  const html = render(element);

  return html;
}

function getReplyTo(_: EmailTemplate): string {
  return 'membership@colorstack.org';
}

function getSubject(input: EmailTemplate): string {
  const subject = match(input)
    .with({ name: 'application-accepted' }, () => {
      return 'ColorStack Onboarding + Slack Invitation';
    })
    .with({ name: 'application-created' }, () => {
      return 'Thank You for Applying to ColorStack';
    })
    .with({ name: 'application-rejected' }, () => {
      return 'Your ColorStack Application';
    })
    .with({ name: 'one-time-code-sent' }, ({ data }) => {
      return `Your One-Time Code is ${data.code}`;
    })
    .with({ name: 'primary-email-changed' }, () => {
      return 'Your Primary Email Was Changed';
    })
    .with({ name: 'student-activated' }, () => {
      return 'Swag Pack 😜';
    })
    .with({ name: 'student-attended-onboarding' }, () => {
      return "Onboarding Session, ✅! What's Next?";
    })
    .with({ name: 'student-removed' }, () => {
      return 'An Update on Your ColorStack Membership';
    })
    .exhaustive();

  const subjectWithEnvironment = match<Environment>(ENV.ENVIRONMENT)
    .with('development', () => `[Development] ${subject}`)
    .with('production', 'test', () => subject)
    .exhaustive();

  return subjectWithEnvironment;
}
