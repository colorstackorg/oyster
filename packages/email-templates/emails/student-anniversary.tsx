import React from 'react';

import { Email } from './components/email';
import { type EmailTemplateData } from '../src/types';

export function StudentAnniversaryEmail({
  firstName,
}: EmailTemplateData<'student-removed'>) {
  return (
    <Email.Template>
      <Email.Preview>
        Congratulations on your {years} year anniversary at ColorStack!
      </Email.Preview>

      <Email.Main>
        <Email.Text>Hello {firstName},</Email.Text>

        <Email.Text>
          We are informing you that you have violated the{' '}
          <Email.Link href="https://docs.google.com/document/d/10hIOyIJQAdU4ZTvil5ECmRlM34Ds0dPGFNpg18WQ1js">
            ColorStack Code of Conduct
          </Email.Link>
          .
          <br />
          <br />
          There have been reports with evidence of you being disrespectful,
          harassing, and/or violent. We have a zero-tolerance policy for this
          type of behavior within our community. As a result, you are
          permanently banned from the ColorStack Family.
          <br />
          <br />
          This decision is final.
        </Email.Text>

        <Email.Signature>
          Regards,
          <br />
          The ColorStack Team
        </Email.Signature>
      </Email.Main>
    </Email.Template>
  );
}

export default StudentRemovedEmail;
