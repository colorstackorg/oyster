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
          Congratulations, you've been accepted to the ColorStack family! 🎉
        </Email.Text>

        <Email.Image
          borderRadius="8px"
          height="210px"
          src="https://media2.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif"
          width="375px"
        />

        <Email.Text>
          Here are your next steps to help you navigate and make the most of
          your membership in our community.
        </Email.Text>

        <ol>
          <li>
            <Email.Text>
              <b>
                <Email.Link href="https://app.colorstack.io/onboarding">
                  Complete your ColorStack profile
                </Email.Link>
                .
              </b>{' '}
              This should only take about 5 minutes. Upon completion, you'll
              have full access to your{' '}
              <Email.Link href="https://app.colorstack.io">
                <b>Member Profile</b>
              </Email.Link>
              . This is the powerhouse of your ColorStack membership. 💪 Take a
              few minutes to:
            </Email.Text>

            <ul>
              <li>
                <Email.Text marginBottom="8px" marginTop="8px">
                  <b>
                    Bookmark your{' '}
                    <Email.Link href="https://app.colorstack.io">
                      Member Profile
                    </Email.Link>
                  </b>
                  .
                </Email.Text>
              </li>
              <li>
                <Email.Text marginBottom="8px" marginTop="8px">
                  Explore upcoming events, open opportunities, compensation,
                  resources & more.
                </Email.Text>
              </li>
            </ul>
          </li>

          <li>
            <Email.Text>
              <b>
                <Email.Link href="https://calendly.com/colorstack-onboarding-ambassador/onboarding">
                  Book your family onboarding session
                </Email.Link>
              </b>{' '}
              to learn more about our programming & offerings, how to be an
              engaged family member, and meet other new members! 📅
            </Email.Text>
          </li>

          <li>
            <Email.Text>
              Lastly, <b>after you complete the above steps</b>, you will
              receive an invite from Slack to join our Slack workspace.
            </Email.Text>
          </li>
        </ol>

        <Email.Text>
          Bookmarking and utilizing your Member Profile, attending an onboarding
          session, and effectively joining our Slack will have you well on your
          way to becoming a top ColorStack member in no time!
        </Email.Text>

        <Email.Text>
          Welcome to the family, and I look forward to connecting with you!
          Let's grow, together.
        </Email.Text>

        <Email.Signature type="jehron" />
      </Email.Main>
    </Email.Template>
  );
}

export default ApplicationAcceptedEmail;
