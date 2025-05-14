import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';

import { addEducation } from '@oyster/core/member-profile/server';
import { AddEducationInput } from '@oyster/core/member-profile/ui';
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

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
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

export default function AddEducationPage() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/profile/education']}>
      <Modal.Header>
        <Modal.Title>Add Education</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <EducationForm.Context>
          <EducationForm.SchoolField error={errors.schoolId} name="schoolId" />
          <EducationForm.OtherSchoolField
            error={errors.otherSchool}
            name="otherSchool"
          />
          <EducationForm.DegreeTypeField
            error={errors.degreeType}
            name="degreeType"
          />
          <EducationForm.FieldOfStudyField error={errors.major} name="major" />
          <EducationForm.OtherFieldOfStudyField
            error={errors.otherMajor}
            name="otherMajor"
          />
          <EducationForm.StartDateField
            error={errors.startDate}
            name="startDate"
          />
          <EducationForm.EndDateField error={errors.endDate} name="endDate" />
        </EducationForm.Context>

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
