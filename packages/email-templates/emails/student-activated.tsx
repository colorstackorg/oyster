import React from 'react';

import { EmailTemplateData } from '../src/types';
import { Email } from './components/email';

export function StudentActivatedEmail({
  firstName,
  studentProfileUrl,
}: EmailTemplateData<'student-activated'>) {
  return (
    <Email.Template>
      <Email.Preview>
        Congratulations, you are now an activated ColorStack member! 🎉 It's
        time to claim your swag pack! 🎁 Here is how you can do so:
      </Email.Preview>

      <Email.Main>
        <Email.Text>Hi {firstName},</Email.Text>

        <Email.Text>
          Congratulations on becoming an activated ColorStack member! You've
          shown your dedication to the community and we couldn't be more
          grateful. It's time for you to claim your <b>ColorStack swag pack</b>!
          🎁
          <br />
          <br />
          You'll need to do the following to claim your swag pack:
        </Email.Text>

        <ol>
          <li>
            <Email.Text>Click the link below.</Email.Text>
          </li>
          <li>
            <Email.Text>
              Enter your email address to receive a one-time passcode.
            </Email.Text>
          </li>
          <li>
            <Email.Text>
              Enter the six-digit passcode that we sent to your email.
            </Email.Text>
          </li>
          <li>
            <Email.Text>
              Submit your mailing address for the swag pack. 🎉
            </Email.Text>
          </li>
        </ol>

        <Email.Button href={`${studentProfileUrl}/home/claim-swag-pack`}>
          Claim Swag Pack
        </Email.Button>

        <Email.Signature />
      </Email.Main>
    </Email.Template>
  );
}

export default StudentActivatedEmail;
