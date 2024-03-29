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

import { ENV, IS_TEST } from '@/shared/env';
import { Environment } from '@/shared/types';
import { getPostmarkInstance } from '../shared/email.utils';

// Types

type FromType = 'jehron' | 'notifications';

// Constants

const FromData: Record<FromType, string> = {
  jehron: 'Jehron Petty <jehron@colorstack.org>',
  notifications: 'ColorStack <notifications@colorstack.org>',
};

const From: Record<EmailTemplate['name'], FromType> = {
  'application-accepted': 'jehron',
  'application-created': 'notifications',
  'application-rejected': 'notifications',
  'primary-email-changed': 'notifications',
  'one-time-code-sent': 'notifications',
  'student-activated': 'notifications',
  'student-attended-onboarding': 'notifications',
  'student-removed': 'notifications',
} as const;

const Template: Record<EmailTemplate['name'], (...args: any) => JSX.Element> = {
  'application-accepted': ApplicationAcceptedEmail,
  'application-created': ApplicationCreatedEmail,
  'application-rejected': ApplicationRejectedEmail,
  'one-time-code-sent': OneTimeCodeSentEmail,
  'primary-email-changed': PrimaryEmailChangedEmail,
  'student-activated': StudentActivatedEmail,
  'student-attended-onboarding': StudentAttendedOnboardingEmail,
  'student-removed': StudentRemovedEmail,
};

// Instances

export async function sendEmail(input: EmailTemplate) {
  if (IS_TEST) {
    return;
  }

  const postmark = getPostmarkInstance();

  await postmark.sendEmail({
    From: getFrom(input),
    HtmlBody: getHtml(input),
    ReplyTo: getReplyTo(input),
    Subject: getSubject(input),
    To: input.to,
  });
}

function getFrom(input: EmailTemplate): string {
  const fromType = From[input.name];
  const from = FromData[fromType];
  return from;
}

function getHtml(input: EmailTemplate): string {
  const template = Template[input.name];
  const html = render(template(input.data));
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
