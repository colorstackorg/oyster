import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { type z } from 'zod';

import {
  EDUCATION_LEVEL_TO_DEGREE_TYPE,
  type EducationLevel,
} from '@oyster/core/education/types';
import { addEducation } from '@oyster/core/member-profile/server';
import {
  AddEducationInput,
  type DegreeType,
  type School,
} from '@oyster/core/member-profile/ui';
import { db } from '@oyster/db';
import { type Major } from '@oyster/types';
import { ErrorMessage, getErrors, validateForm } from '@oyster/ui';

import {
  OnboardingBackButton,
  OnboardingButtonGroup,
  OnboardingContinueButton,
  OnboardingSectionDescription,
  OnboardingSectionTitle,
} from '@/routes/onboarding';
import { EducationForm } from '@/shared/components/education-form';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const [member, education] = await Promise.all([
    db
      .selectFrom('students')
      .leftJoin('schools', 'schools.id', 'students.schoolId')
      .select([
        'educationLevel',
        'graduationYear',
        'major',
        'otherMajor',
        'schools.id as schoolId',
        'schools.name as schoolName',
        'otherSchool',
      ])
      .where('students.id', '=', user(session))
      .executeTakeFirstOrThrow(),

    db
      .selectFrom('educations')
      .leftJoin('schools', 'schools.id', 'educations.schoolId')
      .select([
        'educations.id',
        'degreeType',
        'endDate',
        'major',
        'otherMajor',
        'otherSchool',
        'schoolId',
        'startDate',
        'schools.name as schoolName',
      ])
      .where('studentId', '=', user(session))
      .executeTakeFirst(),
  ]);

  return json({ education, member });
}

const AddEducationFormData = AddEducationInput.omit({
  studentId: true,
}).extend({
  endDate: AddEducationInput.shape.endDate.refine((value) => {
    return dayjs(value).year() >= 1000;
  }, 'Please fill out all 4 digits of the year.'),

  startDate: AddEducationInput.shape.startDate.refine((value) => {
    return dayjs(value).year() >= 1000;
  }, 'Please fill out all 4 digits of the year.'),
});

type AddEducationFormData = z.infer<typeof AddEducationFormData>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    AddEducationFormData
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    return json({
      error: 'End date must be after the start date.',
      errors,
    });
  }

  try {
    await addEducation({
      ...data,
      studentId: user(session),
    });

    return redirect(Route['/onboarding/work']);
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}

export default function EducationHistoryForm() {
  const { education, member } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { error, errors } = getErrors(actionData);

  const school: Pick<School, 'id' | 'name'> = {
    id: '',
    name: '',
  };

  if (education && education.schoolId && education.schoolName) {
    school.id = education.schoolId;
    school.name = education.schoolName;
  } else if (member.schoolId && member.schoolName) {
    school.id = member.schoolId;
    school.name = member.schoolName;
  } else if (member.otherSchool) {
    school.id = 'other';
    school.name = member.otherSchool;
  }

  const degreeType = education?.degreeType as DegreeType;

  return (
    <Form className="form" method="post">
      <OnboardingSectionTitle>Education</OnboardingSectionTitle>
      <OnboardingSectionDescription>
        Tell us more about your current education.
      </OnboardingSectionDescription>

      <EducationForm.Context>
        <EducationForm.SchoolField
          defaultValue={school}
          error={errors.schoolId}
          name="schoolId"
        />
        <EducationForm.OtherSchoolField
          defaultValue={education?.otherSchool || undefined}
          error={errors.otherSchool}
          name="otherSchool"
        />
        <EducationForm.DegreeTypeField
          defaultValue={
            degreeType ||
            EDUCATION_LEVEL_TO_DEGREE_TYPE[
              member.educationLevel as EducationLevel
            ]
          }
          error={errors.degreeType}
          name="degreeType"
        />
        <EducationForm.FieldOfStudyField
          defaultValue={(education?.major || member.major) as Major}
          error={errors.major}
          name="major"
        />
        <EducationForm.OtherFieldOfStudyField
          defaultValue={education?.otherMajor || member.otherMajor || undefined}
          error={errors.otherMajor}
          name="otherMajor"
        />
        <EducationForm.StartDateField
          defaultValue={education?.startDate.slice(0, 7) || undefined}
          error={errors.startDate}
          name="startDate"
        />
        <EducationForm.EndDateField
          defaultValue={education?.endDate.slice(0, 7)}
          error={errors.endDate}
          name="endDate"
        />

        <input type="hidden" name="id" value={education?.id} />
      </EducationForm.Context>

      <ErrorMessage>{error}</ErrorMessage>

      <OnboardingButtonGroup>
        <OnboardingBackButton to="/onboarding/emails" />
        <OnboardingContinueButton />
      </OnboardingButtonGroup>
    </Form>
  );
}
