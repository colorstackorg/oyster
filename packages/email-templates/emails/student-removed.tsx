import React from 'react';

import { Email } from './components/email';
import { type EmailTemplateData } from '../src/types';

export function StudentRemovedEmail(_: EmailTemplateData<'student-removed'>) {
  return (
    <Email.Template>
      <Email.Preview>
        You have violated the ColorStack Code of Conduct.
      </Email.Preview>

      <Email.Main>
        <Email.Text>We're here with some unfortunate news.</Email.Text>

        <Email.Text>
          You have violated the{' '}
          <Email.Link href="https://docs.google.com/document/d/10hIOyIJQAdU4ZTvil5ECmRlM34Ds0dPGFNpg18WQ1js">
            ColorStack Code of Conduct
          </Email.Link>
          , and as a result you have been permanently banned from the ColorStack
          community.
        </Email.Text>

        <Email.Signature />
      </Email.Main>
    </Email.Template>
  );
}

export default StudentRemovedEmail;
