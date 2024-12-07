import React from 'react';

import { Email } from './components/email';
import { type EmailTemplateData } from '../src/types';

export function StudentAnniversaryEmail({
  firstName,
  years,
}: EmailTemplateData<'student-anniversary'>) {
  return (
    <Email.Template>
      <Email.Preview>
        🎉 Congratulations on {years} {years > 1 ? 'years' : 'year'} with
        ColorStack!
      </Email.Preview>

      <Email.Main>
        <Email.Text>Hello {firstName},</Email.Text>

        <Email.Text>
          Congratulations on reaching {years} {years > 1 ? 'years' : 'year'}{' '}
          with ColorStack! Your commitment and contributions to our community
          have truly made a difference. We’re so grateful to have you as part of
          the ColorStack family.
          <br />
          <br />
          Over the past {years > 1 ? years + ' years' : 'year'}, you’ve shown
          unwavering support, talent, and passion. Thanks to members like you,
          ColorStack continues to thrive and empower individuals across tech.
          <br />
          <br />
          Here's to many more impactful years together! 🎉
        </Email.Text>

        <Email.Signature>
          Best Regards,
          <br />
          The ColorStack Team
        </Email.Signature>
      </Email.Main>
    </Email.Template>
  );
}

export default StudentAnniversaryEmail;
