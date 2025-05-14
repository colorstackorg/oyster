import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigate,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { generatePath } from 'react-router';
import { type z } from 'zod';

import { editEducation } from '@oyster/core/member-profile/server';
import {
  type DegreeType,
  Education,
  type School,
} from '@oyster/core/member-profile/ui';
import { db } from '@oyster/db';
import { type Major } from '@oyster/types';
import {
  Button,
  ErrorMessage,
  getErrors,
  Modal,
  validateForm,
} from '@oyster/ui';

import { EducationForm } from '@/shared/components/education-form';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const education = await getEducation({
    id: params.id as string,
    studentId: user(session),
  });

  return json({
    education,
  });
}

async function getEducation({
  id,
  studentId,
}: Pick<Education, 'id' | 'studentId'>) {
  const row = await db
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
    .where('educations.id', '=', id)
    .where('studentId', '=', studentId)
    .executeTakeFirstOrThrow();

  return row;
}

const EditEducationInput = Education.pick({
  degreeType: true,
  endDate: true,
  id: true,
  major: true,
  otherMajor: true,
  otherSchool: true,
  schoolId: true,
  startDate: true,
  studentId: true,
});

type EditEducationInput = z.infer<typeof EditEducationInput>;

const EditEducationFormData = EditEducationInput.omit({
  id: true,
  studentId: true,
}).extend({
  endDate: EditEducationInput.shape.endDate.refine((value) => {
    return dayjs(value).year() >= 1000;
  }, 'Please fill out all 4 digits of the year.'),

  startDate: EditEducationInput.shape.startDate.refine((value) => {
    return dayjs(value).year() >= 1000;
  }, 'Please fill out all 4 digits of the year.'),
});

type EditEducationFormData = z.infer<typeof EditEducationFormData>;

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    EditEducationFormData
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  try {
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      return json({
        error: 'End date must be after the start date.',
        errors,
      });
    }

    await editEducation({
      ...data,
      id: params.id as string,
      studentId: user(session),
    });

    toast(session, {
      message: 'Edited education.',
    });

    return redirect(Route['/profile/education'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}

const keys = EditEducationFormData.keyof().enum;

export default function EditEducationPage() {
  const { error, errors } = getErrors(useActionData<typeof action>());
  const { education } = useLoaderData<typeof loader>();

  const navigate = useNavigate();

  function onDelete() {
    navigate(
      generatePath(Route['/profile/education/:id/delete'], {
        id: education.id,
      })
    );
  }

  const school: Pick<School, 'id' | 'name'> =
    education.schoolId && education.schoolName
      ? { id: education.schoolId, name: education.schoolName }
      : { id: 'other', name: 'Other' };

  return (
    <Modal onCloseTo={Route['/profile/education']}>
      <Modal.Header>
        <Modal.Title>Edit Education</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <EducationForm.Context>
          <EducationForm.SchoolField
            defaultValue={school}
            error={errors.schoolId}
            name={keys.schoolId}
          />
          <EducationForm.OtherSchoolField
            defaultValue={education.otherSchool || undefined}
            error={errors.otherSchool}
            name={keys.otherSchool}
          />
          <EducationForm.DegreeTypeField
            defaultValue={education.degreeType as DegreeType}
            error={errors.degreeType}
            name={keys.degreeType}
          />
          <EducationForm.FieldOfStudyField
            defaultValue={education.major as Major}
            error={errors.major}
            name={keys.major}
          />
          <EducationForm.OtherFieldOfStudyField
            defaultValue={education.otherMajor || undefined}
            error={errors.otherMajor}
            name={keys.otherMajor}
          />
          <EducationForm.StartDateField
            defaultValue={education.startDate.slice(0, 7)}
            error={errors.startDate}
            name={keys.startDate}
          />
          <EducationForm.EndDateField
            defaultValue={education.endDate.slice(0, 7)}
            error={errors.endDate}
            name={keys.endDate}
          />
        </EducationForm.Context>

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group flexDirection="row-reverse" spacing="between">
          <Button.Submit name="action" value="edit">
            Update
          </Button.Submit>

          <Button
            color="error"
            onClick={onDelete}
            type="button"
            variant="secondary"
          >
            Delete
          </Button>
        </Button.Group>
      </Form>
    </Modal>
  );
}

export function ErrorBoundary() {
  return <></>;
}
