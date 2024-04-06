import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { generatePath } from 'react-router';
import { type z } from 'zod';

import { type Major } from '@oyster/types';
import { Button, Form, getActionErrors, Modal, validateForm } from '@oyster/ui';

import { EducationForm } from '../shared/components/education-form';
import { Route } from '../shared/constants';
import { db, editEducation } from '../shared/core.server';
import { type DegreeType, Education, type School } from '../shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '../shared/session.server';

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

  const form = await request.formData();

  const { data, errors } = validateForm(
    EditEducationFormData,
    Object.fromEntries(form)
  );

  try {
    if (!data) {
      return json({
        error: 'Please fix the above errors.',
        errors,
      });
    }

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
      type: 'success',
    });

    return redirect(Route['/profile/education'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({
      error: (e as Error).message,
      errors,
    });
  }
}

const {
  degreeType,
  endDate,
  major,
  otherMajor,
  otherSchool,
  schoolId,
  startDate,
} = EditEducationFormData.keyof().enum;

export default function EditEducationPage() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());
  const { education } = useLoaderData<typeof loader>();

  const submitting = useNavigation().state === 'submitting';

  const navigate = useNavigate();

  function onClose() {
    navigate(Route['/profile/education']);
  }

  function onDelete() {
    navigate(
      generatePath(Route.DELETE_EDUCATION, {
        id: education.id,
      })
    );
  }

  const school: Pick<School, 'id' | 'name'> =
    education.schoolId && education.schoolName
      ? { id: education.schoolId, name: education.schoolName }
      : { id: 'other', name: 'Other' };

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Edit Education</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <EducationForm.Context>
          <EducationForm.SchoolField
            defaultValue={school}
            error={errors.schoolId}
            name={schoolId}
          />
          <EducationForm.OtherSchoolField
            defaultValue={education.otherSchool || undefined}
            error={errors.otherSchool}
            name={otherSchool}
          />
          <EducationForm.DegreeTypeField
            defaultValue={education.degreeType as DegreeType}
            error={errors.degreeType}
            name={degreeType}
          />
          <EducationForm.FieldOfStudyField
            defaultValue={education.major as Major}
            error={errors.major}
            name={major}
          />
          <EducationForm.OtherFieldOfStudyField
            defaultValue={education.otherMajor || undefined}
            error={errors.otherMajor}
            name={otherMajor}
          />
          <EducationForm.StartDateField
            defaultValue={education.startDate.slice(0, 7)}
            error={errors.startDate}
            name={startDate}
          />
          <EducationForm.EndDateField
            defaultValue={education.endDate.slice(0, 7)}
            error={errors.endDate}
            name={endDate}
          />
        </EducationForm.Context>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group flexDirection="row-reverse" spacing="between">
          <Button name="action" loading={submitting} type="submit" value="edit">
            Update
          </Button>

          <Button
            color="error"
            onClick={onDelete}
            type="button"
            variant="secondary"
          >
            Delete
          </Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}

export function ErrorBoundary() {
  return <></>;
}
