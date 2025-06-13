import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { z } from 'zod';

import { addWorkExperience } from '@oyster/core/member-profile/server';
import {
  AddWorkExperienceInput,
  WorkForm,
} from '@oyster/core/member-profile/ui';
import {
  Address,
  Button,
  ErrorMessage,
  getErrors,
  Modal,
  validateForm,
} from '@oyster/ui';

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

const AddWorkExperienceFormData = AddWorkExperienceInput.omit({
  studentId: true,
}).extend({
  isCurrentRole: z.string().optional(),
});

type AddWorkExperienceFormData = z.infer<typeof AddWorkExperienceFormData>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    AddWorkExperienceFormData
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  if (data.endDate && data.startDate > data.endDate) {
    return json({
      error: 'End date must be after the start date.',
      errors,
    });
  }

  await addWorkExperience({
    ...data,
    studentId: user(session),
  });

  toast(session, {
    message: 'Added work experience.',
  });

  return redirect(Route['/profile/work'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const keys = AddWorkExperienceFormData.keyof().enum;

export default function AddWorkExperiencePage() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/profile/work']}>
      <Modal.Header>
        <Modal.Title>Add Work Experience</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <WorkForm.Context>
          <WorkForm.TitleField error={errors.title} name={keys.title} />
          <WorkForm.EmploymentTypeField
            error={errors.employmentType}
            name={keys.employmentType}
          />
          <WorkForm.CompanyField
            displayName={keys.companyName}
            error={errors.companyId}
            name={keys.companyId}
          />
          <WorkForm.LocationTypeField
            error={errors.locationType}
            name={keys.locationType}
          />

          <Address>
            <Address.HalfGrid>
              <WorkForm.CityField
                error={errors.locationCity}
                name={keys.locationCity}
              />
              <WorkForm.StateField
                error={errors.locationState}
                name={keys.locationState}
              />
            </Address.HalfGrid>
          </Address>

          <WorkForm.CurrentRoleField
            error={errors.isCurrentRole}
            name={keys.isCurrentRole}
          />
          <WorkForm.StartDateField
            error={errors.startDate}
            name={keys.startDate}
          />
          <WorkForm.EndDateField error={errors.endDate} name={keys.endDate} />
        </WorkForm.Context>

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
