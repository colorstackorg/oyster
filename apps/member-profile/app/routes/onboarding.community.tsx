import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { sql } from 'kysely';
import { z } from 'zod';

import { updateMember } from '@oyster/core/member-profile/server';
import { ISO8601Date, nullableField, Student } from '@oyster/types';
import {
  Divider,
  ErrorMessage,
  Field,
  getErrors,
  Input,
  validateForm,
} from '@oyster/ui';

import {
  OnboardingBackButton,
  OnboardingButtonGroup,
  OnboardingContinueButton,
  OnboardingSectionDescription,
  OnboardingSectionTitle,
} from '@/routes/onboarding';
import {
  BirthdateField,
  EthnicityField,
  HometownField,
} from '@/shared/components/profile.personal';
import { Route } from '@/shared/constants';
import { getMember, getMemberEthnicities } from '@/shared/queries';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const memberId = user(session);

  const [ethnicities, member] = await Promise.all([
    getMemberEthnicities(memberId),
    getMember(memberId)
      .select([
        sql<string>`to_char(birthdate, 'YYYY-MM-DD')`.as('birthdate'),
        'calendlyUrl',
        'githubUrl',
        'hometown',
        'hometownCoordinates',
        'instagramHandle',
        'linkedInUrl',
        'personalWebsiteUrl',
        'twitterHandle',
      ])
      .executeTakeFirstOrThrow(),
  ]);

  return { ethnicities, member };
}

const CommunityData = z.object({
  birthdate: nullableField(ISO8601Date.nullable()),
  calendlyUrl: nullableField(Student.shape.calendlyUrl),
  ethnicities: nullableField(
    z
      .string()
      .trim()
      .transform((value) => value.split(','))
      .nullable()
  ),
  githubUrl: nullableField(Student.shape.githubUrl),
  hometown: nullableField(Student.shape.hometown),
  hometownLatitude: Student.shape.hometownLatitude,
  hometownLongitude: Student.shape.hometownLongitude,
  instagramHandle: nullableField(Student.shape.instagramHandle),
  linkedInUrl: Student.shape.linkedInUrl,
  personalWebsiteUrl: nullableField(Student.shape.personalWebsiteUrl),
  twitterHandle: nullableField(Student.shape.twitterHandle),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, CommunityData);

  if (!result.ok) {
    return json(result, { status: 400 });
  }

  const memberId = user(session);

  try {
    await updateMember(memberId, {
      ...result.data,
      ethnicities: result.data.ethnicities || [],
    });

    return redirect(Route['/onboarding/slack']);
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}

export default function OnboardingCommunityForm() {
  const { ethnicities, member } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { error, errors } = getErrors(actionData);

  return (
    <Form className="form" method="post">
      <OnboardingSectionTitle>
        Connect with ColorStack Members
      </OnboardingSectionTitle>

      <OnboardingSectionDescription>
        ColorStack's strength is the community! Connect with other members to
        find opportunities, collaborate on projects, and build your network.
      </OnboardingSectionDescription>

      <Field
        error={errors.linkedInUrl}
        label="LinkedIn URL"
        labelFor="linkedInUrl"
        required
      >
        <Input
          defaultValue={member.linkedInUrl || undefined}
          id="linkedInUrl"
          name="linkedInUrl"
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field
          error={errors.instagramHandle}
          label="Instagram Handle"
          labelFor="instagramHandle"
        >
          <Input
            defaultValue={member.instagramHandle || undefined}
            id="instagramHandle"
            name="instagramHandle"
          />
        </Field>

        <Field
          error={errors.twitterHandle}
          label="Twitter Handle"
          labelFor="twitterHandle"
        >
          <Input
            defaultValue={member.twitterHandle || undefined}
            id="twitterHandle"
            name="twitterHandle"
          />
        </Field>

        <Field error={errors.githubUrl} label="GitHub URL" labelFor="githubUrl">
          <Input
            defaultValue={member.githubUrl || undefined}
            id="githubUrl"
            name="githubUrl"
          />
        </Field>

        <Field
          error={errors.calendlyUrl}
          label="Calendly URL"
          labelFor="calendlyUrl"
        >
          <Input
            defaultValue={member.calendlyUrl || undefined}
            id="calendlyUrl"
            name="calendlyUrl"
          />
        </Field>

        <Field
          error={errors.personalWebsiteUrl}
          label="Personal Website"
          labelFor="personalWebsiteUrl"
        >
          <Input
            defaultValue={member.personalWebsiteUrl || undefined}
            id="personalWebsiteUrl"
            name="personalWebsiteUrl"
          />
        </Field>
      </div>

      <Divider my="2" />

      <HometownField
        defaultLatitude={member.hometownCoordinates?.y || undefined}
        defaultLongitude={member.hometownCoordinates?.x || undefined}
        defaultValue={member.hometown || undefined}
        description="Rep your hometown!"
        error={errors.hometown}
        latitudeName="hometownLatitude"
        longitudeName="hometownLongitude"
        name="hometown"
      />
      <EthnicityField
        defaultValue={ethnicities}
        description="Rep your flag! See the ethnic breakdown of our members in the dropdown."
        error={errors.ethnicities}
        name="ethnicities"
      />
      <BirthdateField
        defaultValue={member.birthdate || undefined}
        error={errors.birthdate}
        name="birthdate"
      />

      <ErrorMessage>{error}</ErrorMessage>

      <OnboardingButtonGroup>
        <OnboardingBackButton to="/onboarding/emails" />
        <OnboardingContinueButton />
      </OnboardingButtonGroup>
    </Form>
  );
}
