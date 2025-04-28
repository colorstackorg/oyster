import { json } from '@remix-run/node';
import { Form, useActionData, useSearchParams } from '@remix-run/react';
import { useState } from 'react';

import {
  Address,
  Button,
  ErrorMessage,
  Field,
  Input,
  PhoneNumberInput,
  Public,
  Radio,
  Text,
} from '@oyster/ui';

import { WorkForm } from '@/modules/employment/ui/work-form';
import { EducationForm } from '@/shared/components/education-form';
import { ExperienceList } from '@/shared/components/profile';
import { CurrentLocationField } from '@/shared/components/profile.general';
import {
  EthnicityField,
  HometownField,
} from '@/shared/components/profile.personal';
import { BirthdateField } from '@/shared/components/profile.personal';

export async function loader() {
  return json({});
}

export async function action() {
  return json({ error: '' });
}

export default function OnboardingFlow() {
  const actionData = useActionData<typeof action>();

  return (
    <Public.Content layout="lg">
      <Form className="form" method="post">
        <Field error="" label="First Name" labelFor="firstName" required>
          <Input defaultValue="" id="firstName" name="firstName" required />
        </Field>

        <Field error="" label="Last Name" labelFor="lastName" required>
          <Input defaultValue="" id="lastName" name="lastName" required />
        </Field>

        <Field error="" label="Email" labelFor="email" required>
          <Input
            defaultValue=""
            id="email"
            name="email"
            required
            type="email"
          />
        </Field>

        <CurrentLocationField
          defaultValue=""
          defaultLatitude={0}
          defaultLongitude={0}
          error=""
          latitudeName="locationLatitude"
          longitudeName="locationLongitude"
          name="location"
        />
        <HometownField
          latitudeName="hometownLatitude"
          longitudeName="hometownLongitude"
          defaultValue={undefined}
          error={undefined}
          name="hometown"
        />
        <EthnicityField
          defaultValue={[]}
          error={undefined}
          name="ethnicities"
        />

        <BirthdateField
          defaultValue={undefined}
          error={undefined}
          name="birthdate"
        />

        <Field
          description="Enter your 10-digit phone number. We'll use this to send you important ColorStack updates."
          error={undefined}
          label="Phone Number"
          labelFor="phoneNumber"
        >
          <PhoneNumberInput
            defaultValue={undefined}
            id="phoneNumber"
            name="phoneNumber"
          />
        </Field>

        <SocialFieldset />
        <EducationHistoryField />
        <WorkHistoryField />

        <ErrorMessage>{actionData?.error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Continue</Button.Submit>
        </Button.Group>
      </Form>
    </Public.Content>
  );
}

function SocialFieldset() {
  return (
    <>
      <Field
        error={undefined}
        label="LinkedIn URL"
        labelFor="linkedInUrl"
        required
      >
        <Input defaultValue="" id="linkedInUrl" name="linkedInUrl" required />
      </Field>

      <Field
        error={undefined}
        label="Instagram Handle"
        labelFor="instagramHandle"
      >
        <Input defaultValue="" id="instagramHandle" name="instagramHandle" />
      </Field>

      <Field error={undefined} label="Twitter Handle" labelFor="twitterHandle">
        <Input defaultValue="" id="twitterHandle" name="twitterHandle" />
      </Field>

      <Field error={undefined} label="GitHub URL" labelFor="githubUrl">
        <Input defaultValue="" id="githubUrl" name="githubUrl" />
      </Field>

      <Field error={undefined} label="Calendly URL" labelFor="calendlyUrl">
        <Input defaultValue="" id="calendlyUrl" name="calendlyUrl" />
      </Field>

      <Field
        error={undefined}
        label="Personal Website"
        labelFor="personalWebsiteUrl"
      >
        <Input
          defaultValue=""
          id="personalWebsiteUrl"
          name="personalWebsiteUrl"
        />
      </Field>
    </>
  );
}

function WorkHistoryField() {
  const [hasWorkExperience, setHasWorkExperience] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setHasWorkExperience(e.target.value === 'yes');
  }

  return (
    <>
      <Field
        error={undefined}
        label="Have you had any work experience relevant to your career goals?"
        labelFor="workExperience"
        required
      >
        <Radio.Group defaultValue="">
          <Radio
            color="lime-100"
            label="Yes, I have relevant work experience."
            id="workExperienceYes"
            name="workExperience"
            onChange={onChange}
            required
            value="yes"
          />
          <Radio
            color="amber-100"
            label="No, I don't have relevant work experience."
            id="workExperienceNo"
            name="workExperience"
            onChange={onChange}
            required
            value="no"
          />
        </Radio.Group>
      </Field>

      {hasWorkExperience && (
        <WorkForm.Context>
          <WorkForm.TitleField error="" name="title" />
          <WorkForm.EmploymentTypeField error="" name="employmentType" />
          <WorkForm.CompanyField error="" name="companyCrunchbaseId" />
          <WorkForm.OtherCompanyField error="" name="companyName" />
          <WorkForm.LocationTypeField error="" name="locationType" />

          <Address>
            <Address.HalfGrid>
              <WorkForm.CityField error="" name="locationCity" />
              <WorkForm.StateField error="" name="locationState" />
            </Address.HalfGrid>
          </Address>

          <WorkForm.CurrentRoleField error="" name="isCurrentRole" />
          <WorkForm.StartDateField error="" name="startDate" />
          <WorkForm.EndDateField error="" name="endDate" />
        </WorkForm.Context>
      )}
    </>
  );
}

function EducationHistoryField() {
  return (
    <EducationForm.Context>
      <EducationForm.SchoolField error="" name="schoolId" />
      <EducationForm.OtherSchoolField error="" name="otherSchool" />
      <EducationForm.DegreeTypeField error="" name="degreeType" />
      <EducationForm.FieldOfStudyField error="" name="major" />
      <EducationForm.OtherFieldOfStudyField error="" name="otherMajor" />
      <EducationForm.StartDateField error="" name="startDate" />
      <EducationForm.EndDateField error="" name="endDate" />
    </EducationForm.Context>
  );
}
