import React from 'react';

import { Email } from './components/email';
import { type EmailTemplateData } from '../src/types';

export function ApplicationAcceptedEmail({
  firstName,
}: EmailTemplateData<'application-accepted'>) {
  return (
    <Email.Template>
      <Email.Preview>
        Welcome to the ColorStack family, {firstName}! ❤️ Here are your next
        steps to join our community:
      </Email.Preview>

      <Email.Main>
        <Email.Text>Hi {firstName},</Email.Text>
        <Email.Text>
          Congratulations, you've been accepted to join the ColorStack family!
          🎉
        </Email.Text>

        <Email.Image
          borderRadius="8px"
          height="210px"
          src="https://media2.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif"
          width="375px"
        />

        <Email.Text>Here are your next steps...</Email.Text>

        <ol>
          <li>
            <Email.Text>
              <Email.Link href="https://app.colorstack.io">
                Sign into your very own Member Profile
              </Email.Link>
              , where you'll be able to see cool information about your
              membership and the community. 🥳
            </Email.Text>
          </li>

          <li>
            <Email.Text>
              Earn your first ColorStack points (you'll learn what that means
              soon) by{' '}
              <Email.Link href="https://app.colorstack.io/profile">
                updating your education + work history
              </Email.Link>
              . 🏆
            </Email.Text>
          </li>

          <li>
            <Email.Text>
              <Email.Link href="https://calendly.com/onboarding-ambassador/onboarding">
                Book your group onboarding call
              </Email.Link>{' '}
              to learn more about our programming, how to best use the Slack,
              and meet a few other new members. 📅
            </Email.Text>
          </li>

          <li>
            <Email.Text>
              We&apos;ll send you an invitation to join our Slack - look out for
              an email from them. 🔗
            </Email.Text>
          </li>
        </ol>

        <Email.Text>
          Thanks again for joining, and I look forward to connecting with you!
          Let&apos;s grow, together.
        </Email.Text>
        <Email.Signature type="jehron" />
      </Email.Main>
    </Email.Template>
  );
}

export default ApplicationAcceptedEmail;
