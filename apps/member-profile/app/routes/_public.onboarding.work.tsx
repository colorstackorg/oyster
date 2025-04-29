import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  Link,
  useActionData,
  useFetcher,
  useLoaderData,
} from '@remix-run/react';
import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'react-feather';
import { match } from 'ts-pattern';
import { z } from 'zod';

import {
  sendEmailCode,
  SendEmailCodeInput,
} from '@oyster/core/member-profile/server';
import { db } from '@oyster/db';
import {
  Address,
  Button,
  Divider,
  ErrorMessage,
  Field,
  Input,
  Modal,
  PhoneNumberInput,
  Public,
  Radio,
  Text,
  type TextProps,
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
import { ensureUserAuthenticated, user } from '@/shared/session.server';

const Step = z
  .enum(['personal', 'education', 'social', 'work'])
  .default('personal')
  .catch('personal');

type Step = z.infer<typeof Step>;

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);
  const searchParams = new URL(request.url).searchParams;

  const stepParam = searchParams.get('step');
  const step = Step.parse(stepParam);

  const [member, secondaryEmail] = await Promise.all([
    db
      .selectFrom('students')
      .where('id', '=', user(session))
      .select(['firstName', 'lastName', 'email', 'phoneNumber'])
      .executeTakeFirst(),

    db
      .selectFrom('studentEmails')
      .where('studentId', '=', user(session))
      .select('email')
      .orderBy('createdAt', 'asc')
      .offset(1)
      .executeTakeFirst(),
  ]);

  if (!member) {
    return redirect(Route['/login']);
  }

  return json({ member, secondaryEmail, step });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const stepParam = url.searchParams.get('step');
  const step = Step.parse(stepParam);

  if (step === 'personal') {
    url.searchParams.set('step', 'social');

    return redirect(url.toString());
  }

  if (step === 'social') {
    url.searchParams.set('step', 'work');

    return redirect(url.toString());
  }

  if (step === 'work') {
    url.searchParams.set('step', 'education');

    return redirect(url.toString());
  }

  if (step === 'education') {
    url.searchParams.set('step', 'social');

    return redirect(url.toString());
  }

  return json({ error: '' });
}

export default function OnboardingFlow() {
  const { step } = useLoaderData<typeof loader>();

  return (
    <Public.Content layout="lg">
      {match(step)
        .with('personal', GeneralForm)
        .with('social', SocialForm)
        .with('education', EducationHistoryField)
        .with('work', WorkHistoryField)
        .exhaustive()}
    </Public.Content>
  );
}

function GeneralForm() {
  const { member, secondaryEmail } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher();

  console.log(fetcher.data);
  console.log(fetcher.formData && Object.fromEntries(fetcher.formData));

  return (
    <Form className="form" method="post">
      <SectionTitle>General Information</SectionTitle>

      <Field error="" label="First Name" labelFor="firstName" required>
        <Input
          defaultValue={member.firstName}
          id="firstName"
          name="firstName"
          required
        />
      </Field>

      <Field error="" label="Last Name" labelFor="lastName" required>
        <Input
          defaultValue={member.lastName}
          id="lastName"
          name="lastName"
          required
        />
      </Field>

      <Field
        description="This is the primary email address that you applied with."
        error=""
        label="Email"
        labelFor="email"
        required
      >
        <Input
          defaultValue={member.email}
          disabled
          id="email"
          name="email"
          required
          type="email"
        />
      </Field>

      <Field
        description="Add your personal email so that you can still log in to ColorStack even after you graduate and no longer have access to your school email."
        error={fetcher.data?.error}
        label="Secondary Email"
        labelFor="secondaryEmail"
        required
      >
        <Input
          defaultValue={secondaryEmail?.email}
          id="secondaryEmail"
          name="secondaryEmail"
          onBlur={(e) => {
            fetcher.submit(
              { email: e.currentTarget.value },
              {
                action: Route['/profile/emails/add/start'],
                method: 'post',
                navigate: false,
              }
            );
          }}
          required
          type="email"
        />
      </Field>

      {!!fetcher.data && !fetcher.data.error && (
        <Modal
          onCloseTo={{
            pathname: Route['/onboarding'],
            search: new URLSearchParams({ step: 'personal' }).toString(),
          }}
        >
          <Modal.Header>
            <Modal.Title>Add Email Address</Modal.Title>
            <Modal.CloseButton />
          </Modal.Header>

          <Modal.Description>
            Please input the 6-digit passcode that you received to complete the
            addition of{' '}
            <span style={{ fontWeight: 700 }}>{fetcher.data.email}</span> to
            your profile.
          </Modal.Description>

          <Form className="form" method="post">
            <Field error="" label="Code" labelFor="code" required>
              <Input autoFocus id="code" name="code" required />
            </Field>

            <ErrorMessage>{fetcher.data.error}</ErrorMessage>

            <Button.Group>
              <Button.Submit>Verify</Button.Submit>
            </Button.Group>
          </Form>
        </Modal>
      )}

      {/* <Field
        description="Enter your 10-digit phone number. We'll use this to send you important ColorStack updates."
        error={undefined}
        label="Phone Number"
        labelFor="phoneNumber"
      >
        <PhoneNumberInput
          defaultValue={member.phoneNumber || undefined}
          id="phoneNumber"
          name="phoneNumber"
        />
      </Field> */}

      <ErrorMessage>{actionData?.error}</ErrorMessage>

      <Button.Group spacing="between">
        <BackButton step="personal" />
        <ContinueButton disabled={!secondaryEmail?.email} />
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

// Reusable

type BackButtonProps = {
  step: z.infer<typeof Step>;
};

function BackButton({ step }: BackButtonProps) {
  return (
    <Button.Slot variant="secondary">
      <Link
        to={{
          pathname: Route['/onboarding'],
          search: new URLSearchParams({ step }).toString(),
        }}
      >
        <ArrowLeft className="size-5" /> Back
      </Link>
    </Button.Slot>
  );
}

type ContinueButtonProps = {
  disabled?: boolean;
};

function ContinueButton({ disabled }: ContinueButtonProps) {
  return (
    <Button.Group>
      <Button.Submit disabled={disabled}>
        Continue <ArrowRight className="size-5" />
      </Button.Submit>
    </Button.Group>
  );
}

function SectionDescription(props: TextProps) {
  return <Text color="gray-500" {...props} />;
}

function SectionTitle(props: TextProps) {
  return <Text variant="xl" {...props} />;
}
