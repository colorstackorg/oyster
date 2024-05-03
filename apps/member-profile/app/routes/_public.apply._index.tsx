import {
  type ActionFunctionArgs,
  json,
  type MetaFunction,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';
import { z } from 'zod';

import { Application as ApplicationType } from '@oyster/types';
import {
  Button,
  Checkbox,
  Form,
  getActionErrors,
  Link,
  Text,
  type TextProps,
  validateForm,
} from '@oyster/ui';

import { apply } from '@/member-profile.server';
import { Application } from '@/member-profile.ui';
import { Route } from '@/shared/constants';
import { formatUrl } from '@/shared/url.utils';

export const meta: MetaFunction = () => {
  return [{ title: 'ColorStack Family Application' }];
};

const ApplyInput = ApplicationType.pick({
  contribution: true,
  educationLevel: true,
  email: true,
  firstName: true,
  gender: true,
  goals: true,
  graduationYear: true,
  lastName: true,
  major: true,
  otherDemographics: true,
  otherMajor: true,
  otherSchool: true,
  race: true,
  schoolId: true,
}).extend({
  codeOfConduct: z.preprocess((value) => value === '1', z.boolean()),
  linkedInUrl: ApplicationType.shape.linkedInUrl.transform(formatUrl),
});

type ApplyInput = z.infer<typeof ApplyInput>;

const ApplyFormData = ApplyInput.extend({
  otherSchool: z.string().optional(),
  schoolId: z
    .string()
    .min(1)
    .optional()
    .transform((value) => {
      return value === 'other' ? undefined : value;
    }),
});

type ApplyFormData = z.infer<typeof ApplyFormData>;

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();

  const { data, errors } = validateForm(ApplyFormData, {
    ...Object.fromEntries(form),
    otherDemographics: form.getAll('otherDemographics'),
    race: form.getAll('race'),
  });

  if (!data) {
    return json({
      error: 'Please fix the issues above.',
      errors,
    });
  }

  try {
    await apply(data);

    return redirect(Route['/apply/thank-you']);
  } catch (e) {
    return json({
      error: (e as Error).message,
      errors,
    });
  }
}

const keys = ApplyFormData.keyof().enum;

export default function ApplicationPage() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

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
            error={errors.firstName}
            name={keys.firstName}
          />
          <Application.LastNameField
            error={errors.lastName}
            name={keys.lastName}
          />
          <Application.EmailField error={errors.email} name={keys.email} />
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
