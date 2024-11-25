import React from 'react';

import { Email } from './components/email';
import { type EmailTemplateData } from '../src/types';

export function OneTimeCodeSentEmail({
  code = '123456',
  firstName,
}: EmailTemplateData<'one-time-code-sent'>) {
  return (
    <Email.Template>
      <Email.Preview>
        Your ColorStack one-time code is valid for 10 minutes. Use it while it's
        hot!
      </Email.Preview>

      <Email.Main>
        <Email.Text>Hi {firstName},</Email.Text>
        <Email.Text>Here is your one-time passcode:</Email.Text>

        <Email.Text fontSize="32px" fontWeight="700">
          {code}
        </Email.Text>

        <Email.Signature />
      </Email.Main>
    </Email.Template>
  );
}

export default OneTimeCodeSentEmail;
