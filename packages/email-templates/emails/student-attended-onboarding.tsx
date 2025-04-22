import React from 'react';

import { Email } from './components/email';
import { type EmailTemplateData } from '../src/types';

export function StudentAttendedOnboardingEmail({
  firstName,
  studentsInSession,
}: EmailTemplateData<'student-attended-onboarding'>) {
  studentsInSession = studentsInSession.sort((a, b) => {
    return a.fullName.localeCompare(b.fullName);
  });

  return (
    <Email.Template>
      <Email.Preview>
        Thanks for attending your ColorStack onboarding session! Here's what's
        next for you:
      </Email.Preview>

      <Email.Main>
        <Email.Text>Hi {firstName},</Email.Text>

        <Email.Text>
          Thank you for attending your ColorStack onboarding session! We're
          excited to have you be an active member in our community. Here's a
          recap of every thing you learned today:
        </Email.Text>

        <Email.Link href="https://docs.google.com/document/d/1wp0wq4nwVHiRNOtkiPnpqJ76oEkG6G6BRXyGmph5DXU/edit?usp=sharing">
          ColorStack Onboarding One-Pager
        </Email.Link>

        {studentsInSession.length > 0 && (
          <>
            <Email.Text>
              Additionally, here are your fellow ColorStack members that
              attended your onboarding session. Be sure to connect with them on
              LinkedIn and stay in touch! 🤝
            </Email.Text>

            <ul>
              {studentsInSession.map((student) => {
                const year = student.graduationYear.toString().slice(2);

                return (
                  <li key={student.id}>
                    <Email.Text>
                      <Email.Link href={student.linkedInUrl!}>
                        {student.fullName}
                      </Email.Link>{' '}
                      - {student.school} '{year}
                    </Email.Text>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <Email.Signature />
      </Email.Main>
    </Email.Template>
  );
}

export default StudentAttendedOnboardingEmail;
