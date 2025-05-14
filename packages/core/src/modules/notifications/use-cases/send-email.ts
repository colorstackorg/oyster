import { render } from '@react-email/render';
import { match } from 'ts-pattern';

import {
  ApplicationAcceptedEmail,
  ApplicationCreatedEmail,
  ApplicationRejectedEmail,
  type EmailTemplate,
  OneTimeCodeSentEmail,
  PrimaryEmailChangedEmail,
  ReferralAcceptedEmail,
  ReferralSentEmail,
  StudentAnniversaryEmail,
  StudentAttendedOnboardingEmail,
  StudentGraduationEmail,
  StudentRemovedEmail,
} from '@oyster/email-templates';

import { getObject } from '@/infrastructure/s3';
import { ENVIRONMENT } from '@/shared/env';
import {
  getNodemailerTransporter,
  getPostmarkInstance,
} from '../shared/email.utils';

// Constants

const FROM_JEHRON = 'Jehron Petty <jehron@colorstack.org>';
const FROM_NOTIFICATIONS = 'ColorStack <notifications@colorstack.org>';

// Functions

/**
 * Sends an email to the given recipient.
 *
 * Note: This function will behave differently based on the environment.
 * - In `production`, this will send an email using Postmark.
 * - In `development`, this will send an email using Nodemailer, which under
 *   the hood will simply use the developer's own email account.
 * - In `test`, this function will do nothing b/c we don't want to send emails.
 *
 * The reason we can't use a cloud service like Postmark in development is
 * because you typically need to verify your domain before you can send emails
 * with a service like Postmark. However, most contributors won't be able to do
 * so because they don't own the domain of their personal/school email. So, we
 * use Nodemailer in development, which allows developers to authenticate their
 * own email account and send emails from there.
 */
export async function sendEmail(input: EmailTemplate) {
  return match(ENVIRONMENT)
    .with('development', () => {
      return sendEmailWithNodemailer(input);
    })
    .with('production', () => {
      return sendEmailWithPostmark(input);
    })
    .with('test', () => {
      // We don't want to send emails in the test environment...
      // so we do nothing here!
    })
    .exhaustive();
}

async function sendEmailWithPostmark(input: EmailTemplate) {
  const postmark = getPostmarkInstance();

  const from = match(input.name)
    .with('application-accepted', () => FROM_JEHRON)
    .with('application-created', () => FROM_NOTIFICATIONS)
    .with('application-rejected', () => FROM_NOTIFICATIONS)
    .with('one-time-code-sent', () => FROM_NOTIFICATIONS)
    .with('primary-email-changed', () => FROM_NOTIFICATIONS)
    .with('referral-accepted', () => FROM_NOTIFICATIONS)
    .with('referral-sent', () => FROM_NOTIFICATIONS)
    .with('student-anniversary', () => FROM_NOTIFICATIONS)
    .with('student-attended-onboarding', () => FROM_NOTIFICATIONS)
    .with('student-graduation', () => FROM_NOTIFICATIONS)
    .with('student-removed', () => FROM_NOTIFICATIONS)
    .exhaustive();

  const attachments = await getAttachments(input);

  await postmark.sendEmail({
    Attachments: attachments?.map((attachment) => {
      return {
        Content: attachment.content,
        ContentID: null,
        ContentType: attachment.contentType,
        Name: attachment.name,
      };
    }),
    From: from,
    HtmlBody: getHtml(input),
    ReplyTo: 'noreply@colorstack.org',
    Subject: getSubject(input),
    To: input.to,
  });

  console.log(`[${input.name}]: Email sent to "${input.to}"! 📫`);
}

async function sendEmailWithNodemailer(input: EmailTemplate) {
  const transporter = getNodemailerTransporter();

  const attachments = await getAttachments(input);

  // Note: We don't need to specify the `from` field here because it'll
  // automatically default to the `SMTP_USERNAME` variable that we set.
  await transporter.sendMail({
    attachments: attachments?.map((attachment) => {
      return {
        content: attachment.content,
        contentType: attachment.contentType,
        encoding: 'base64',
        filename: attachment.name,
      };
    }),
    html: getHtml(input),
    subject: getSubject(input),
    to: input.to,
  });

  console.log(`[${input.name}]: Email sent to "${input.to}"! 📫`);
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
    .with({ name: 'referral-accepted' }, ({ data }) => {
      return ReferralAcceptedEmail(data);
    })
    .with({ name: 'referral-sent' }, ({ data }) => {
      return ReferralSentEmail(data);
    })
    .with({ name: 'student-anniversary' }, ({ data }) => {
      return StudentAnniversaryEmail(data);
    })
    .with({ name: 'student-attended-onboarding' }, ({ data }) => {
      return StudentAttendedOnboardingEmail(data);
    })
    .with({ name: 'student-graduation' }, ({ data }) => {
      return StudentGraduationEmail(data);
    })
    .with({ name: 'student-removed' }, ({ data }) => {
      return StudentRemovedEmail(data);
    })
    .exhaustive();

  const html = render(element);

  return html;
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
    .with({ name: 'referral-accepted' }, () => {
      return 'Your Referral Was Accepted!';
    })
    .with({ name: 'referral-sent' }, () => {
      return "You've Been Referred to Join ColorStack!";
    })
    .with({ name: 'student-anniversary' }, ({ data }) => {
      return `Happy ${data.years} Year Anniversary, ${data.firstName}! 🎉`;
    })
    .with({ name: 'student-attended-onboarding' }, () => {
      return "Onboarding Session, ✅! What's Next?";
    })
    .with({ name: 'student-graduation' }, () => {
      return "Don't lose access to ColorStack! 😰";
    })
    .with({ name: 'student-removed' }, () => {
      return 'An Update on Your ColorStack Membership';
    })
    .exhaustive();

  const subjectWithEnvironment = match(ENVIRONMENT)
    .with('development', () => `[Development] ${subject}`)
    .with('production', 'test', () => subject)
    .exhaustive();

  return subjectWithEnvironment;
}

type EmailAttachment = {
  content: string;
  contentType: 'application/pdf';
  name: string;
};

async function getAttachments(
  input: EmailTemplate
): Promise<EmailAttachment[] | undefined> {
  const attachments = await match(input)
    .with(
      { name: 'application-accepted' },
      { name: 'application-created' },
      { name: 'application-rejected' },
      { name: 'one-time-code-sent' },
      { name: 'primary-email-changed' },
      { name: 'referral-accepted' },
      { name: 'referral-sent' },
      { name: 'student-anniversary' },
      { name: 'student-graduation' },
      { name: 'student-removed' },
      () => {
        return undefined;
      }
    )
    .with({ name: 'student-attended-onboarding' }, async () => {
      const file = await getObject({ key: 'onboarding-deck.pdf' });

      return [
        {
          content: file.base64,
          contentType: 'application/pdf',
          name: 'ColorStack Onboarding Deck.pdf',
        } as EmailAttachment,
      ];
    })
    .exhaustive();

  return attachments;
}
