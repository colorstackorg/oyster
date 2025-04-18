import { Email } from './components/email';
import { type EmailTemplateData } from '../src/types';

export function StudentGraduationEmail({
  firstName,
  graduatingYear,
  years,
}: EmailTemplateData<'student-graduating'>) {
  return (
    <Email.Template>
      <Email.Preview>
        🎓 Don’t Let Your Account Graduate Without You! 🚨 Add your personal
        email
      </Email.Preview>

      <Email.Main>
        <Email.Text>Hi {firstName} 👋,</Email.Text>

        <Email.Text>
          ⏳ Time is ticking! With your {graduatingYear} graduation approaching,
          we need you to add a{' '}
          <span style={{ fontWeight: 'bold' }}>personal email</span>
          to keep your ColorStack account active. 🛑
        </Email.Text>

        <Email.Text>🔑 Keep your access to:</Email.Text>

        <ul>
          <li>📁 Exclusive resources</li>
          <li>📅 Community events</li>
          <li>👥 10,000+ member network</li>
        </ul>

        <Email.Button href="https://app.colorstack.io/profile/emails">
          🚀 Add Email Now
        </Email.Button>

        <Email.Text>
          Cheers to your next chapter! 🥂
          <br />
          The ColorStack Team 🌈
        </Email.Text>

        <Email.Signature />
      </Email.Main>
    </Email.Template>
  );
}
