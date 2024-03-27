import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { z } from 'zod';

import {
  Button,
  Form,
  getActionErrors,
  Modal,
  validateForm,
} from '@colorstack/core-ui';

import { EducationForm } from '../shared/components/education-form';
import { Route } from '../shared/constants';
import { addEducation } from '../shared/core.server';
import { AddEducationInput } from '../shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '../shared/session.server';

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

  const form = await request.formData();

  const { data, errors } = validateForm(
    AddEducationFormData,
    Object.fromEntries(form)
  );

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

  try {
    await addEducation({
      ...data,
      studentId: user(session),
    });

    toast(session, {
      message: 'Added education.',
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
} = AddEducationFormData.keyof().enum;

export default function AddEducationPage() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const navigate = useNavigate();

  function onClose() {
    navigate(Route['/profile/education']);
  }

  const submitting = useNavigation().state === 'submitting';

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Add Education</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <EducationForm.Context>
          <EducationForm.SchoolField error={errors.schoolId} name={schoolId} />
          <EducationForm.OtherSchoolField
            error={errors.otherSchool}
            name={otherSchool}
          />
          <EducationForm.DegreeTypeField
            error={errors.degreeType}
            name={degreeType}
          />
          <EducationForm.FieldOfStudyField error={errors.major} name={major} />
          <EducationForm.OtherFieldOfStudyField
            error={errors.otherMajor}
            name={otherMajor}
          />
          <EducationForm.StartDateField
            error={errors.startDate}
            name={startDate}
          />
          <EducationForm.EndDateField error={errors.endDate} name={endDate} />
        </EducationForm.Context>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button loading={submitting} type="submit">
            Save
          </Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
