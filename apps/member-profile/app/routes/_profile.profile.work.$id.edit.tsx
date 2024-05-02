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
import { z } from 'zod';

import {
  Address,
  Button,
  Form,
  getActionErrors,
  Modal,
  validateForm,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { editWorkExperience, getWorkExperience } from '@/shared/core.server';
import {
  EditWorkExperienceInput,
  type EmploymentType,
  type LocationType,
  WorkForm,
} from '@/shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const workExperience = await getWorkExperience(
    {
      id: params.id as string,
      studentId: user(session),
    },
    [
      'workExperiences.companyName as otherCompany',
      'workExperiences.employmentType',
      'workExperiences.endDate',
      'workExperiences.id',
      'workExperiences.locationCity',
      'workExperiences.locationType',
      'workExperiences.locationState',
      'workExperiences.startDate',
      'workExperiences.title',
    ],
    {
      withCompany: true,
    }
  );

  if (!workExperience) {
    throw new Response(null, { status: 404 });
  }

  return json({
    workExperience,
  });
}

const EditWorkExperienceFormData = EditWorkExperienceInput.omit({
  id: true,
  studentId: true,
}).extend({
  endDate: EditWorkExperienceInput.shape.endDate.refine((value) => {
    return dayjs(value).year() >= 1000;
  }, 'Please fill out all 4 digits of the year.'),

  isCurrentRole: z.string().optional(),

  startDate: EditWorkExperienceInput.shape.startDate.refine((value) => {
    return dayjs(value).year() >= 1000;
  }, 'Please fill out all 4 digits of the year.'),
});

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    EditWorkExperienceFormData,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Please fix the errors above.',
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
    await editWorkExperience({
      ...data,
      id: params.id as string,
      studentId: user(session),
    });

    toast(session, {
      message: 'Edited work experience.',
      type: 'success',
    });

    return redirect(Route['/profile/work'], {
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

const keys = EditWorkExperienceFormData.keyof().enum;

export default function EditWorkExperiencePage() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());
  const { workExperience } = useLoaderData<typeof loader>();

  const navigate = useNavigate();

  const submitting = useNavigation().state === 'submitting';

  function onDelete() {
    navigate(
      generatePath(Route['/profile/work/:id/delete'], {
        id: workExperience.id,
      })
    );
  }

  return (
    <Modal onCloseTo={Route['/profile/work']}>
      <Modal.Header>
        <Modal.Title>Edit Work Experience</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <WorkForm.Context
          defaultValue={{
            isCurrentRole: !workExperience.endDate,
            isOtherCompany: !workExperience.companyId,
          }}
        >
          <WorkForm.TitleField
            defaultValue={workExperience.title}
            error={errors.title}
            name={keys.title}
          />
          <WorkForm.EmploymentTypeField
            defaultValue={workExperience.employmentType as EmploymentType}
            error={errors.employmentType}
            name={keys.employmentType}
          />
          <WorkForm.CompanyField
            defaultValue={
              workExperience.companyId
                ? {
                    crunchbaseId: workExperience.companyCrunchbaseId!,
                    name: workExperience.companyName!,
                  }
                : {
                    crunchbaseId: '',
                    name: 'Other',
                  }
            }
            error={errors.companyCrunchbaseId}
            name={keys.companyCrunchbaseId}
          />
          <WorkForm.OtherCompanyField
            defaultValue={workExperience.otherCompany || undefined}
            error={errors.companyName}
            name={keys.companyName}
          />
          <WorkForm.LocationTypeField
            defaultValue={workExperience.locationType as LocationType}
            error={errors.locationType}
            name={keys.locationType}
          />

          <Address>
            <Address.HalfGrid>
              <WorkForm.CityField
                defaultValue={workExperience.locationCity || undefined}
                error={errors.locationCity}
                name={keys.locationCity}
              />

              <WorkForm.StateField
                defaultValue={workExperience.locationState || undefined}
                error={errors.locationState}
                name={keys.locationState}
              />
            </Address.HalfGrid>
          </Address>

          <WorkForm.CurrentRoleField
            defaultValue={!workExperience.endDate}
            error={errors.isCurrentRole}
            name={keys.isCurrentRole}
          />
          <WorkForm.StartDateField
            defaultValue={workExperience.startDate.slice(0, 7)}
            error={errors.startDate}
            name={keys.startDate}
          />
          <WorkForm.EndDateField
            defaultValue={workExperience.endDate?.slice(0, 7)}
            error={errors.endDate}
            name={keys.endDate}
          />
        </WorkForm.Context>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group flexDirection="row-reverse" spacing="between">
          <Button.Submit>Update</Button.Submit>

          <Button
            color="error"
            onClick={onDelete}
            submitting={submitting}
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
