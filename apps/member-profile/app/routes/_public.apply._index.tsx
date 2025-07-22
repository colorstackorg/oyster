import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  useActionData,
  useLoaderData,
} from 'react-router';

import { apply } from '@oyster/core/applications';
import { Application, ApplyInput } from '@oyster/core/applications/ui';
import { buildMeta } from '@oyster/core/react-router';
import { getReferral } from '@oyster/core/referrals';
import {
  Button,
  Checkbox,
  ErrorMessage,
  Field,
  getErrors,
  Link,
  Text,
  type TextProps,
  validateForm,
} from '@oyster/ui';

import { getLinkedinAuthUri } from '@/modules/authentication/shared/oauth.utils';
import { Route } from '@/shared/constants';
import { ENV } from '@/shared/constants.server';
import { commitSession, getSession } from '@/shared/session.server';

export const meta: MetaFunction = () => {
  return buildMeta({
    description: `Apply to join the largest community of Black and Latinx Computer Science college students.`,
    image: '/images/og_apply.jpg',
    title: 'Apply to ColorStack',
  });
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { searchParams } = new URL(request.url);

  // The referral ID is passed as a query parameter, and it must be present
  // when the user submits the form in order to be processed correctly.
  const referralId = searchParams.get('r');

  const referral = referralId
    ? await getReferral({
        select: ['email', 'firstName', 'lastName'],
        where: { id: referralId },
      })
    : undefined;

  const linkedinAuthUri = getLinkedinAuthUri({
    clientRedirectUrl: `${ENV.STUDENT_PROFILE_URL}/apply`,
    context: 'apply',
  });

  return {
    email: referral?.email,
    firstName: referral?.firstName,
    lastName: referral?.lastName,
    linkedinAuthUri,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request);
  const form = await request.formData();

  const { searchParams } = new URL(request.url);

  // The referral ID is passed as a query parameter, and it must be present
  // when the user submits the form in order to be processed correctly.
  const referralId = searchParams.get('r');

  if (referralId) {
    form.set('referralId', referralId);
  }

  const result = await validateForm(
    {
      ...Object.fromEntries(form),
      otherDemographics: form.getAll('otherDemographics'),
      race: form.getAll('race'),
    },
    ApplyInput
  );

  if (!result.ok) {
    return data(
      { error: 'Please fix the issues above.', errors: result.errors } as const,
      { status: 400 }
    );
  }

  try {
    await apply(result.data);

    session.flash('email', result.data.email);

    return redirect(Route['/apply/thank-you'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return data({ error: (e as Error).message }, { status: 500 });
  }
}

const keys = ApplyInput.keyof().enum;

export default function ApplicationPage() {
  const { email, firstName, lastName } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <>
      <div className="mb-8 flex flex-col gap-4">
        <Text color="gray-500">
          We exist to increase the number of Black and Latinx Computer Science
          graduates who go on to launch rewarding technical careers.
        </Text>

        <Text color="gray-500">
          Our goal is to remove barriers and create pathways for students
          pursuing careers in technology. While our work centers on supporting
          Black and Latinx students, we welcome any undergraduate CS student who
          shares our vision of a more diverse and inclusive tech industry to
          apply.
        </Text>
      </div>

      <Form className="form" data-gap="2rem" method="post">
        <Application readOnly={false}>
          <Application.FirstNameField
            defaultValue={firstName}
            error={errors.firstName}
            name={keys.firstName}
          />
          <Application.LastNameField
            defaultValue={lastName}
            error={errors.lastName}
            name={keys.lastName}
          />
          <Application.EmailField
            defaultValue={email}
            error={errors.email}
            name={keys.email}
          />
          <LinkedInLogin />
          {/* <Application.LinkedInField
            error={errors.linkedInUrl}
            name={keys.linkedInUrl}
          /> */}
          <Application.SchoolField
            error={errors.schoolId}
            name={keys.schoolId}
          />
          <Application.OtherSchoolField
            error={errors.otherSchool}
            name={keys.otherSchool}
          />
          <Application.MajorField error={errors.major} name={keys.major} />
          <Application.OtherMajorField
            error={errors.otherMajor}
            name={keys.otherMajor}
          />
          <Application.EducationLevelField
            error={errors.educationLevel}
            name={keys.educationLevel}
          />
          <Application.GraduationDateField
            month={{
              error: errors.graduationMonth,
              name: keys.graduationMonth,
            }}
            year={{
              error: errors.graduationYear,
              name: keys.graduationYear,
            }}
          />
          <Application.RaceField error={errors.race} name={keys.race} />
          <Application.GenderField error={errors.gender} name={keys.gender} />
          <Application.OtherDemographicsField
            error={errors.otherDemographics}
            name={keys.otherDemographics}
          />
          <Application.ContributionField
            error={errors.contribution}
            name={keys.contribution}
          />
          <Application.GoalsField error={errors.goals} name={keys.goals} />
        </Application>

        <Field
          description={<CodeOfConductDescription />}
          labelFor={keys.codeOfConduct}
          label="Code of Conduct"
          required
        >
          <Checkbox
            id={keys.codeOfConduct}
            label="I have read, understand and will comply with the ColorStack Code of Conduct."
            name={keys.codeOfConduct}
            required
            value="1"
          />
        </Field>

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Submit fill>Apply</Button.Submit>
      </Form>
    </>
  );
}

function LinkedInLogin() {
  const { linkedinAuthUri } = useLoaderData<typeof loader>();

  return (
    <Field
      description={
        <Text>
          Please ensure that your LinkedIn is up to date as it is a determining
          factor for acceptance. Bonus points if your LinkedIn account is{' '}
          <Link
            href="https://www.linkedin.com/help/linkedin/answer/a1637071"
            target="_blank"
          >
            verified
          </Link>
          .
        </Text>
      }
      // error={error}
      label="LinkedIn Profile/URL"
      labelFor="linkedInUrl"
      required
    >
      <Button.Slot>
        <a href={linkedinAuthUri!} target="_blank">
          Login with LinkedIn
        </a>
      </Button.Slot>
      {/*
      <Input
        defaultValue={defaultValue}
        id={name}
        name={name}
        placeholder="ex: https://www.linkedin.com/in/jehron"
        readOnly={readOnly}
        required
      /> */}
    </Field>
  );
}

function CodeOfConductDescription(props: TextProps) {
  return (
    <Text {...props}>
      Please read the{' '}
      <Link
        href="https://docs.google.com/document/d/10hIOyIJQAdU4ZTvil5ECmRlM34Ds0dPGFNpg18WQ1js"
        target="_blank"
      >
        ColorStack Code of Conduct
      </Link>{' '}
      in full.
    </Text>
  );
}
