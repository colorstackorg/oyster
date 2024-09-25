import React from 'react';

import { Email } from './components/email';
import { type EmailTemplateData } from '../src/types';

export function StudentActivatedEmail({
  firstName,
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

        <Email.Signature />
      </Email.Main>
    </Email.Template>
  );
}

export default StudentActivatedEmail;
