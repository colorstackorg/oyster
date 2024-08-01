import React from 'react';

import { Email } from './components/email';
import { type EmailTemplateData } from '../src/types';

export function ReferralAcceptedEmail({
  firstName,
  referralsUri,
  referredFirstName,
  referredLastName,
}: EmailTemplateData<'referral-accepted'>) {
  return (
    <Email.Template>
      <Email.Preview>Your referral was accepted into ColorStack!</Email.Preview>

      <Email.Main>
        <Email.Text>Hi {firstName},</Email.Text>

        <Email.Text>
          Great news -- {referredFirstName} {referredLastName} used your
          referral and was accepted into ColorStack! 🥳 Thank you for helping to
          grow our community!
        </Email.Text>

        <Email.Button href={referralsUri}>View All Referrals</Email.Button>

        <Email.Signature />
      </Email.Main>
    </Email.Template>
  );
}

export default ReferralAcceptedEmail;
