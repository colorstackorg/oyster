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
import { z } from 'zod';

import { apply } from '@oyster/core/applications';
import { Application, ApplyInput } from '@oyster/core/applications/ui';
import { getLinkedInAuthUri } from '@oyster/core/member-profile/server';
import { buildMeta } from '@oyster/core/react-router';
import { getReferral } from '@oyster/core/referrals';
import {
  Button,
  Checkbox,
  ErrorMessage,
  Field,
  getErrors,
  Link,
  Login,
  Text,
  type TextProps,
  validateForm,
} from '@oyster/ui';
import { getCookie } from '@oyster/utils';

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

  const linkedInInfo = getAuthenticatedLinkedInInfo(request);

  if (!linkedInInfo) {
    const linkedInAuthUri = getLinkedInAuthUri({
      // We want to redirect back to the same page that we're currently on
      // so that we can proceed with the application process.
      clientRedirectUrl: request.url,
    });

    return {
      email: referral?.email,
      firstName: referral?.firstName,
      lastName: referral?.lastName,
      isLinkedInAuthenticated: false,
      linkedInAuthUri,
    };
  }

  return {
    email: linkedInInfo.email.endsWith('.edu') ? linkedInInfo.email : '',
    firstName: linkedInInfo.firstName,
    lastName: linkedInInfo.lastName,
    isLinkedInAuthenticated: true,
  };
}

const AuthenticatedLinkedInToken = z.object({
  email: z.string().email(),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
});

function getAuthenticatedLinkedInInfo(request: Request) {
  const cookie = request.headers.get('Cookie');

  if (!cookie) {
    return null;
  }

  const oauthInfo = getCookie(cookie, 'oauth_info');

  if (!oauthInfo) {
    return null;
  }

  let json: JSON;

  try {
    json = JSON.parse(decodeURIComponent(oauthInfo));
  } catch {
    return null;
  }

  const result = AuthenticatedLinkedInToken.safeParse(json);

  if (!result.success) {
    return null;
  }

  return result.data;
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
  const { isLinkedInAuthenticated } = useLoaderData<typeof loader>();

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

      {isLinkedInAuthenticated ? (
        <ApplicationForm />
      ) : (
        <LinkedInAuthentication />
      )}
    </>
  );
}

function LinkedInAuthentication() {
  const { linkedInAuthUri } = useLoaderData<typeof loader>();

  if (!linkedInAuthUri) {
    return null;
  }

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 rounded-xl border border-gray-100 p-8">
      <Text color="gray-500">
        To proceed, please log into your LinkedIn account.
      </Text>

      <Login.LinkedInButton href={linkedInAuthUri} />
    </div>
  );
}

function ApplicationForm() {
  const { email, firstName, lastName } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Form className="form" data-gap="2rem" method="post">
      <Application readOnly={false}>
        <input type="hidden" name={keys.firstName} value={firstName} />
        <input type="hidden" name={keys.lastName} value={lastName} />

        <Application.EmailField
          defaultValue={email}
          error={errors.email}
          name={keys.email}
        />
        <Application.LinkedInField
          error={errors.linkedInUrl}
          name={keys.linkedInUrl}
        />
        <Application.SchoolField error={errors.schoolId} name={keys.schoolId} />
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
