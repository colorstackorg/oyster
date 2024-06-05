import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';
import dayjs from 'dayjs';
import { type z } from 'zod';

import { Button, Form, getErrors, Modal, validateForm } from '@oyster/ui';

import { addEducation } from '@/member-profile.server';
import { AddEducationInput } from '@/member-profile.ui';
import { EducationForm } from '@/shared/components/education-form';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

const AddEducationFormData = AddEducationInput.omit({ studentId: true }).extend(
  {
    endDate: AddEducationInput.shape.endDate.refine((value) => {
      return dayjs(value).year() >= 1000;
    }, 'Please fill out all 4 digits of the year.'),

    startDate: AddEducationInput.shape.startDate.refine((value) => {
      return dayjs(value).year() >= 1000;
    }, 'Please fill out all 4 digits of the year.'),
  }
);

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

    toast(session, {
      message: 'Added education.',
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

const keys = AddEducationFormData.keyof().enum;

export default function AddEducationPage() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/profile/education']}>
      <Modal.Header>
        <Modal.Title>Add Education</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <EducationForm.Context>
          <EducationForm.SchoolField
            error={errors.schoolId}
            name={keys.schoolId}
          />
          <EducationForm.OtherSchoolField
            error={errors.otherSchool}
            name={keys.otherSchool}
          />
          <EducationForm.DegreeTypeField
            error={errors.degreeType}
            name={keys.degreeType}
          />
          <EducationForm.FieldOfStudyField
            error={errors.major}
            name={keys.major}
          />
          <EducationForm.OtherFieldOfStudyField
            error={errors.otherMajor}
            name={keys.otherMajor}
          />
          <EducationForm.StartDateField
            error={errors.startDate}
            name={keys.startDate}
          />
          <EducationForm.EndDateField
            error={errors.endDate}
            name={keys.endDate}
          />
        </EducationForm.Context>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
