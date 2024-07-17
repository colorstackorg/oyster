import React from 'react';

import { Email } from './components/email';
import { type EmailTemplateData } from '../src/types';

export function ResumeSubmittedEmail({
  edited,
  firstName,
  resumeBookName,
  resumeBookUri,
}: EmailTemplateData<'resume-submitted'>) {
  return (
    <Email.Template>
      <Email.Preview>
        Thank you for submitting your resume to the {resumeBookName} Resume
        Book!
      </Email.Preview>

      <Email.Main>
        <Email.Text>Hi {firstName},</Email.Text>

        <Email.Text>
          Thank you for {edited ? 'resubmitting' : 'submitting'} your resume to
          the {resumeBookName} Resume Book! To view or edit your response, click
          the button below.
        </Email.Text>

        <Email.Button href={resumeBookUri}>Edit Submission</Email.Button>

        <Email.Signature />
      </Email.Main>
    </Email.Template>
  );
}

export default ResumeSubmittedEmail;
