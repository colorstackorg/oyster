import React from 'react';

import { Email } from './components/email';
import { type EmailTemplateData } from '../src/types';

export function ReferralSentEmail({
  firstName,
  referralUri,
  referrerFirstName,
  referrerLastName,
}: EmailTemplateData<'referral-sent'>) {
  return (
    <Email.Template>
      <Email.Preview>
        {referrerFirstName} {referrerLastName} referred you to join ColorStack!
      </Email.Preview>

      <Email.Main>
        <Email.Text>Hi {firstName},</Email.Text>

        <Email.Text>
          {referrerFirstName} {referrerLastName} referred you to join
          ColorStack! Apply to join our community by clicking the button below.
        </Email.Text>

        <Email.Button href={referralUri}>Apply Now</Email.Button>

        <Email.Signature />
      </Email.Main>
    </Email.Template>
  );
}

export default ReferralSentEmail;
