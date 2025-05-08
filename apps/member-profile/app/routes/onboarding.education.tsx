import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';

import { type EducationLevel } from '@oyster/core/education/types';
import { addEducation } from '@oyster/core/member-profile/server';
import { AddEducationInput, DegreeType } from '@oyster/core/member-profile/ui';
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

  const memberId = user(session);

  const [education, member] = await Promise.all([
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
      .where('studentId', '=', memberId)
      .executeTakeFirst(),

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
      .where('students.id', '=', memberId)
      .executeTakeFirstOrThrow(),
  ]);

  return json({ education, member });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    AddEducationInput.omit({ studentId: true })
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

export default function OnboardingEducationForm() {
  const { education } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { error } = getErrors(actionData);

  return (
    <Form className="form" method="post">
      <OnboardingSectionTitle>Education</OnboardingSectionTitle>
      <OnboardingSectionDescription>
        Tell us more about your current education.
      </OnboardingSectionDescription>

      {education ? <FieldsetFromEducation /> : <FieldsetFromMember />}

      <ErrorMessage>{error}</ErrorMessage>

      <OnboardingButtonGroup>
        <OnboardingBackButton to="/onboarding/emails" />
        <OnboardingContinueButton />
      </OnboardingButtonGroup>
    </Form>
  );
}

function FieldsetFromEducation() {
  const { education } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { errors } = getErrors(actionData);

  if (!education) {
    return null;
  }

  return (
    <EducationForm.Context>
      <EducationForm.SchoolField
        defaultValue={
          education.schoolId && education.schoolName
            ? { id: education.schoolId, name: education.schoolName }
            : { id: 'other', name: 'Other' }
        }
        error={errors.schoolId}
        name="schoolId"
      />
      <EducationForm.OtherSchoolField
        defaultValue={education.otherSchool || undefined}
        error={errors.otherSchool}
        name="otherSchool"
      />
      <EducationForm.DegreeTypeField
        defaultValue={education.degreeType as DegreeType}
        error={errors.degreeType}
        name="degreeType"
      />
      <EducationForm.FieldOfStudyField
        defaultValue={education.major as Major}
        error={errors.major}
        name="major"
      />
      <EducationForm.OtherFieldOfStudyField
        defaultValue={education.otherMajor || undefined}
        error={errors.otherMajor}
        name="otherMajor"
      />
      <EducationForm.StartDateField
        defaultValue={education.startDate.slice(0, 7) || undefined}
        error={errors.startDate}
        name="startDate"
      />
      <EducationForm.EndDateField
        defaultValue={education.endDate.slice(0, 7)}
        error={errors.endDate}
        name="endDate"
      />

      <input type="hidden" name="id" value={education.id} />
    </EducationForm.Context>
  );
}

const EDUCATION_LEVEL_TO_DEGREE_TYPE: Record<
  EducationLevel,
  DegreeType | null
> = {
  bootcamp: DegreeType.CERTIFICATE,
  masters: DegreeType.MASTERS,
  other: null,
  phd: DegreeType.DOCTORAL,
  undergraduate: DegreeType.BACHELORS,
};

function FieldsetFromMember() {
  const { education, member } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { errors } = getErrors(actionData);

  if (education) {
    return null;
  }

  return (
    <EducationForm.Context>
      <EducationForm.SchoolField
        defaultValue={
          member.schoolId && member.schoolName
            ? { id: member.schoolId, name: member.schoolName }
            : { id: 'other', name: 'Other' }
        }
        error={errors.schoolId}
        name="schoolId"
      />
      <EducationForm.OtherSchoolField
        defaultValue={member.otherSchool || undefined}
        error={errors.otherSchool}
        name="otherSchool"
      />
      <EducationForm.DegreeTypeField
        defaultValue={
          EDUCATION_LEVEL_TO_DEGREE_TYPE[
            member.educationLevel as EducationLevel
          ] || undefined
        }
        error={errors.degreeType}
        name="degreeType"
      />
      <EducationForm.FieldOfStudyField
        defaultValue={member.major as Major}
        error={errors.major}
        name="major"
      />
      <EducationForm.OtherFieldOfStudyField
        defaultValue={member.otherMajor || undefined}
        error={errors.otherMajor}
        name="otherMajor"
      />
      <EducationForm.StartDateField error={errors.startDate} name="startDate" />
      <EducationForm.EndDateField error={errors.endDate} name="endDate" />
    </EducationForm.Context>
  );
}
