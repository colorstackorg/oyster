import {
  ActionFunctionArgs,
  json,
  MetaFunction,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigation,
} from '@remix-run/react';
import { z } from 'zod';

import {
  Button,
  Checkbox,
  Form,
  getActionErrors,
  Link,
  Text,
  TextProps,
  validateForm,
} from '@oyster/core-ui';
import { Application as ApplicationType } from '@oyster/types';

import { Route } from '../shared/constants';
import { apply } from '../shared/core.server';
import { Application } from '../shared/core.ui';
import { formatUrl } from '../shared/url.utils';

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
    return redirect(Route.APPLICATION_THANK_YOU);
  } catch (e) {
    return json({
      error: (e as Error).message,
      errors,
    });
  }
}

const ApplicationKey = ApplyFormData.keyof().enum;

export default function ApplicationPage() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

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
            name={ApplicationKey.firstName}
          />
          <Application.LastNameField
            error={errors.lastName}
            name={ApplicationKey.lastName}
          />
          <Application.EmailField
            error={errors.email}
            name={ApplicationKey.email}
          />
          <Application.LinkedInField
            error={errors.linkedInUrl}
            name={ApplicationKey.linkedInUrl}
          />
          <Application.SchoolField
            error={errors.schoolId}
            name={ApplicationKey.schoolId}
          />
          <Application.OtherSchoolField
            error={errors.otherSchool}
            name={ApplicationKey.otherSchool}
          />
          <Application.MajorField
            error={errors.major}
            name={ApplicationKey.major}
          />
          <Application.OtherMajorField
            error={errors.otherMajor}
            name={ApplicationKey.otherMajor}
          />
          <Application.EducationLevelField
            error={errors.educationLevel}
            name={ApplicationKey.educationLevel}
          />
          <Application.GraduationYearField
            error={errors.graduationYear}
            name={ApplicationKey.graduationYear}
          />
          <Application.RaceField
            error={errors.race}
            name={ApplicationKey.race}
          />
          <Application.GenderField
            error={errors.gender}
            name={ApplicationKey.gender}
          />
          <Application.OtherDemographicsField
            error={errors.otherDemographics}
            name={ApplicationKey.otherDemographics}
          />
          <Application.GoalsField
            error={errors.goals}
            name={ApplicationKey.goals}
          />
          <Application.ContributionField
            error={errors.contribution}
            name={ApplicationKey.contribution}
          />
        </Application>

        <Form.Field
          description={<CodeOfConductDescription />}
          labelFor={ApplicationKey.codeOfConduct}
          label="Code of Conduct"
          required
        >
          <Checkbox
            id={ApplicationKey.codeOfConduct}
            label="I have read, understand and will comply with the ColorStack Code of Conduct."
            name={ApplicationKey.codeOfConduct}
            required
            value="1"
          />
        </Form.Field>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button fill loading={submitting} type="submit">
          Apply
        </Button>
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
