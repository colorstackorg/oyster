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
              <Email.Link
                href="https://app.colorstack.io/onboarding"
                fontWeight="bold"
              >
                Complete your ColorStack profile
              </Email.Link>
              . This should only take about 5 minutes. Upon completion, you'll
              have full access to your <b>Member Profile</b>. This is the
              powerhouse of your ColorStack membership. 💪 Take a few minutes
              to:
            </Email.Text>

            <ul>
              <li>
                <Email.Text marginBottom="8px" marginTop="8px">
                  <b>
                    Bookmark your{' '}
                    <Email.Link
                      href="https://app.colorstack.io"
                      fontWeight="bold"
                    >
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
              <Email.Link
                href="https://calendly.com/colorstack-onboarding-ambassador/onboarding"
                fontWeight="bold"
              >
                Book your family onboarding session
              </Email.Link>{' '}
              to learn more about our programming & offerings, how to be an
              engaged family member, and meet other new members! 📅
            </Email.Text>
          </li>

          <li>
            <Email.Text fontWeight="700">
              Get involved with your local ColorStack chapter.
            </Email.Text>

            <ul>
              <li>
                <Email.Text marginBottom="8px" marginTop="8px">
                  ColorStack has chapters at campuses across the US and Canada!
                </Email.Text>
              </li>
              <li>
                <Email.Text marginBottom="8px" marginTop="8px">
                  Find out if there is a chapter on your campus{' '}
                  <Email.Link
                    href="https://colorstack.notion.site/colorstack-chapters-list"
                    fontWeight="bold"
                  >
                    here
                  </Email.Link>
                  .
                </Email.Text>
              </li>
              <li>
                <Email.Text marginBottom="8px" marginTop="8px">
                  If you are a leader interested in starting a chapter, learn
                  how to get started in your onboarding session.
                </Email.Text>
              </li>
            </ul>
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

        <Email.Text>
          <i>
            PS: New members will receive an invitation to join our Slack
            community after completing their live onboarding session.
          </i>
        </Email.Text>
      </Email.Main>
    </Email.Template>
  );
}

export default ApplicationAcceptedEmail;
