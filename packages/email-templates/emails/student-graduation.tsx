import React from 'react';

import { Email } from './components/email';
import { type EmailTemplateData } from '../src/types';

export function StudentGraduationEmail({
  firstName,
  graduationYear,
  memberProfileUrl,
}: EmailTemplateData<'student-graduation'>) {
  return (
    <Email.Template>
      <Email.Preview>
        Add a secondary email to your ColorStack account before you graduate! 🚨
      </Email.Preview>

      <Email.Main>
        <Email.Text>Hi {firstName},</Email.Text>

        <Email.Text>
          With your {graduationYear} graduation date fast approaching, please{' '}
          <span style={{ fontWeight: 'bold' }}>
            add a secondary email address
          </span>{' '}
          to keep access to your ColorStack account! 🚨
        </Email.Text>

        <Email.Button href={memberProfileUrl + '/profile/emails'}>
          Add Secondary Email
        </Email.Button>

        <Email.Signature />
      </Email.Main>
    </Email.Template>
  );
}

export default StudentGraduationEmail;
