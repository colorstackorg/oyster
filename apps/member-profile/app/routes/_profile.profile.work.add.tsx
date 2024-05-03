import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';
import dayjs from 'dayjs';
import { z } from 'zod';

import {
  Address,
  Button,
  Form,
  getErrors,
  Modal,
  validateForm,
} from '@oyster/ui';

import { addWorkExperience } from '@/member-profile.server';
import { AddWorkExperienceInput, WorkForm } from '@/member-profile.ui';
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
  endDate: AddWorkExperienceInput.shape.endDate.refine((value) => {
    return dayjs(value).year() >= 1000;
  }, 'Please fill out all 4 digits of the year.'),

  isCurrentRole: z.string().optional(),

  startDate: AddWorkExperienceInput.shape.startDate.refine((value) => {
    return dayjs(value).year() >= 1000;
  }, 'Please fill out all 4 digits of the year.'),
});

type AddWorkExperienceFormData = z.infer<typeof AddWorkExperienceFormData>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    AddWorkExperienceFormData
  );

  if (!ok) {
    return json({ errors });
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

      <RemixForm className="form" method="post">
        <WorkForm.Context>
          <WorkForm.TitleField error={errors.title} name={keys.title} />
          <WorkForm.EmploymentTypeField
            error={errors.employmentType}
            name={keys.employmentType}
          />
          <WorkForm.CompanyField
            error={errors.companyCrunchbaseId}
            name={keys.companyCrunchbaseId}
          />
          <WorkForm.OtherCompanyField
            error={errors.companyName}
            name={keys.companyName}
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

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
