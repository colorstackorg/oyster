import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'react-feather';
import { match } from 'ts-pattern';
import { z } from 'zod';

import {
  Address,
  Button,
  Divider,
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
import { CurrentLocationField } from '@/shared/components/profile.general';
import {
  EthnicityField,
  HometownField,
} from '@/shared/components/profile.personal';
import { BirthdateField } from '@/shared/components/profile.personal';
import { Route } from '@/shared/constants';

export async function loader({ request }: LoaderFunctionArgs) {
  const searchParams = new URL(request.url).searchParams;

  const step = Step.parse(searchParams.get('step'));

  return json({ step });
}

const Step = z
  .enum(['personal', 'education', 'social', 'work'])
  .default('personal')
  .catch('personal');

export async function action({ request }: ActionFunctionArgs) {
  const searchParams = new URL(request.url).searchParams;

  const step = Step.parse(searchParams.get('step'));

  if (step === 'personal') {
    return redirect(Route['/onboarding'] + '?step=social');
  }

  if (step === 'social') {
    return redirect(Route['/onboarding'] + '?step=work');
  }

  if (step === 'work') {
    return redirect(Route['/onboarding'] + '?step=education');
  }

  if (step === 'education') {
    return redirect(Route['/onboarding'] + '?step=social');
  }

  return json({ error: '' });
}

export default function OnboardingFlow() {
  const { step } = useLoaderData<typeof loader>();

  return (
    <Public.Content layout="lg">
      <Form className="form" method="post">
        {match(step)
          .with('personal', () => {
            return (
              <>
                <PersonalForm />
              </>
            );
          })
          .with('social', () => {
            return <SocialForm />;
          })
          .with('education', () => {
            return <EducationHistoryField />;
          })
          .with('work', () => {
            return <WorkHistoryField />;
          })
          .exhaustive()}
      </Form>
    </Public.Content>
  );
}

function PersonalForm() {
  const actionData = useActionData<typeof action>();

  return (
    <Form className="form" method="post">
      <Field error="" label="First Name" labelFor="firstName" required>
        <Input defaultValue="" id="firstName" name="firstName" required />
      </Field>

      <Field error="" label="Last Name" labelFor="lastName" required>
        <Input defaultValue="" id="lastName" name="lastName" required />
      </Field>

      <Field error="" label="Email" labelFor="email" required>
        <Input defaultValue="" id="email" name="email" required type="email" />
      </Field>

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

      <ErrorMessage>{actionData?.error}</ErrorMessage>

      <Button.Group spacing="between">
        <Button.Slot variant="secondary">
          <Link
            to={{
              pathname: Route['/onboarding'],
              search: new URLSearchParams({ step: 'social' }).toString(),
            }}
          >
            <ArrowLeft className="size-5" /> Back
          </Link>
        </Button.Slot>

        <Button.Submit>
          Continue <ArrowRight className="size-5" />
        </Button.Submit>
      </Button.Group>
    </Form>
  );
}

function SocialForm() {
  const actionData = useActionData<typeof action>();

  return (
    <Form className="form" method="post">
      <Text variant="xl">Connect with ColorStack Members</Text>

      <Text color="gray-500">
        ColorStack's strength is the community! Connect with other members to
        find opportunities, collaborate on projects, and build your network.
      </Text>

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
        description="Rep your hometown!"
        latitudeName="hometownLatitude"
        longitudeName="hometownLongitude"
        defaultValue={undefined}
        error={undefined}
        name="hometown"
      />
      <EthnicityField
        defaultValue={[]}
        description="Rep your flag! See the ethnic breakdown of our members in the dropdown."
        error={undefined}
        name="ethnicities"
      />

      <BirthdateField
        defaultValue={undefined}
        error={undefined}
        name="birthdate"
      />

      <Divider my="2" />

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

      <ErrorMessage>{actionData?.error}</ErrorMessage>

      <Button.Group>
        <Button.Submit>Continue</Button.Submit>
      </Button.Group>
    </Form>
  );
}

function WorkHistoryField() {
  const actionData = useActionData<typeof action>();

  const [hasWorkExperience, setHasWorkExperience] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setHasWorkExperience(e.target.value === 'yes');
  }

  return (
    <Form className="form" method="post">
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

      <ErrorMessage>{actionData?.error}</ErrorMessage>

      <Button.Group>
        <Button.Submit>Continue</Button.Submit>
      </Button.Group>
    </Form>
  );
}

function EducationHistoryField() {
  const actionData = useActionData<typeof action>();

  return (
    <Form className="form" method="post">
      <EducationForm.Context>
        <EducationForm.SchoolField error="" name="schoolId" />
        <EducationForm.OtherSchoolField error="" name="otherSchool" />
        <EducationForm.DegreeTypeField error="" name="degreeType" />
        <EducationForm.FieldOfStudyField error="" name="major" />
        <EducationForm.OtherFieldOfStudyField error="" name="otherMajor" />
        <EducationForm.StartDateField error="" name="startDate" />
        <EducationForm.EndDateField error="" name="endDate" />
      </EducationForm.Context>

      <ErrorMessage>{actionData?.error}</ErrorMessage>

      <Button.Group>
        <Button.Submit>Continue</Button.Submit>
      </Button.Group>
    </Form>
  );
}
