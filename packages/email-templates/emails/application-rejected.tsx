import React from 'react';

import { Email } from './components/email';
import { type EmailTemplateData } from '../src/types';

export function ApplicationRejectedEmail({
  firstName,
  reason,
}: EmailTemplateData<'application-rejected'>) {
  return (
    <Email.Template>
      <Email.Preview>
        Unfortunately, we're unable to admit you into our community at this
        time.
      </Email.Preview>

      <Email.Main>
        <Email.Text>Hi {firstName},</Email.Text>

        <Email.Text>
          We hope this email finds you well. We are reaching out regarding the
          status of your application. Unfortunately, we're unable to admit you
          into our community at this time.
        </Email.Text>

        {!!reason && <Email.Text>{reason}</Email.Text>}

        <Email.Text>
          If you are interested in attending any of our public events, please
          feel free to check out our social media (@colorstackorg) for the most
          up to date information. Good luck in all of your future endeavors.
        </Email.Text>

        <Email.Signature />
      </Email.Main>
    </Email.Template>
  );
}

export default ApplicationRejectedEmail;
