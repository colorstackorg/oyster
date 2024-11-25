import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';

import { apply } from '@oyster/core/applications';
import { Application, ApplyInput } from '@oyster/core/applications/ui';
import { getReferral } from '@oyster/core/referrals';
import { buildMeta } from '@oyster/core/remix';
import {
  Button,
  Checkbox,
  Form,
  getErrors,
  Link,
  Text,
  type TextProps,
  validateForm,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
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

  return json({
    email: referral?.email,
    firstName: referral?.firstName,
    lastName: referral?.lastName,
  });
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

  const { data, errors, ok } = await validateForm(
    {
      ...Object.fromEntries(form),
      otherDemographics: form.getAll('otherDemographics'),
      race: form.getAll('race'),
    },
    ApplyInput
  );

  if (!ok) {
    return json(
      { error: 'Please fix the issues above.', errors },
      { status: 400 }
    );
  }

  try {
    await apply(data);

    session.flash('email', data.email);

    return redirect(Route['/apply/thank-you'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message, errors }, { status: 500 });
  }
}

const keys = ApplyInput.keyof().enum;

export default function ApplicationPage() {
  const { email, firstName, lastName } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <>
      <Text className="mb-8" color="gray-500">
        We exist to increase the number of Black and Latinx Computer Science
        graduates that go on to launch rewarding technical careers. The stronger
        our community, the better positioned we are to move the needle for
        racial diversity in tech. Thank you for joining us.
      </Text>

      <RemixForm className="form" data-gap="2rem" method="post">
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
          <Application.LinkedInField
            error={errors.linkedInUrl}
            name={keys.linkedInUrl}
          />
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
          <Application.GraduationYearField
            error={errors.graduationYear}
            name={keys.graduationYear}
          />
          <Application.RaceField error={errors.race} name={keys.race} />
          <Application.GenderField error={errors.gender} name={keys.gender} />
          <Application.OtherDemographicsField
            error={errors.otherDemographics}
            name={keys.otherDemographics}
          />
          <Application.GoalsField error={errors.goals} name={keys.goals} />
          <Application.ContributionField
            error={errors.contribution}
            name={keys.contribution}
          />
        </Application>

        <Form.Field
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
        </Form.Field>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Submit fill>Apply</Button.Submit>
      </RemixForm>
    </>
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
