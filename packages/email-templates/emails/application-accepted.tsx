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
                Sign in to & bookmark your{' '}
                <Email.Link href="https://app.colorstack.io">
                  Member Profile
                </Email.Link>
                .
              </b>{' '}
              This profile is the <b>powerhouse</b> of your ColorStack
              membership. 💪 Take a few minutes to:
            </Email.Text>

            <ul>
              <li>
                <Email.Text marginBottom="8px" marginTop="8px">
                  Update your education & work history.
                </Email.Text>
              </li>
              <li>
                <Email.Text marginBottom="8px" marginTop="8px">
                  Add a secondary, non-school email address.
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
              engaged family member, & meet other new members! 📅
            </Email.Text>
          </li>

          <li>
            <Email.Text>
              <b>Look out for your invite to join our Slack </b> - the email
              will come from Slack. 📨
            </Email.Text>

            <ul>
              <li>
                <Email.Text marginBottom="8px" marginTop="8px">
                  Our Slack is large, but don't be intimidated!
                </Email.Text>
              </li>
              <li>
                <Email.Text marginBottom="8px" marginTop="8px">
                  <b>
                    Attend an{' '}
                    <Email.Link href="https://calendly.com/colorstack-onboarding-ambassador/onboarding">
                      onboarding session
                    </Email.Link>{' '}
                    ASAP
                  </b>{' '}
                  to learn how to navigate Slack and join in on the
                  conversations.
                </Email.Text>
              </li>
            </ul>
          </li>
        </ol>

        <Email.Text>
          Bookmarking and utilizing your Member Profile, attending an onboarding
          session, and joining our Slack will have you well on your way to
          becoming a top ColorStack member in no time!
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
