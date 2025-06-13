import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { z } from 'zod';

import { addWorkExperience } from '@oyster/core/member-profile/server';
import {
  AddWorkExperienceInput,
  type EmploymentType,
  type LocationType,
} from '@oyster/core/member-profile/ui';
import { WorkForm } from '@oyster/core/member-profile/ui';
import { db } from '@oyster/db';
import {
  Address,
  Divider,
  ErrorMessage,
  Field,
  getErrors,
  Radio,
  validateForm,
} from '@oyster/ui';

import {
  OnboardingBackButton,
  OnboardingButtonGroup,
  OnboardingContinueButton,
  OnboardingSectionDescription,
  OnboardingSectionTitle,
} from '@/routes/onboarding';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const workExperience = await db
    .selectFrom('workExperiences')
    .leftJoin('companies', 'companies.id', 'workExperiences.companyId')
    .select([
      'companies.id as companyId',
      'companies.name as companyName',
      'companies.imageUrl as companyImageUrl',
      'workExperiences.companyName as otherCompany',
      'workExperiences.employmentType',
      'workExperiences.endDate',
      'workExperiences.id',
      'workExperiences.locationCity',
      'workExperiences.locationType',
      'workExperiences.locationState',
      'workExperiences.startDate',
      'workExperiences.title',
    ])
    .where('workExperiences.studentId', '=', user(session))
    .executeTakeFirst();

  return json({ workExperience });
}

const AddWorkExperienceFormData = AddWorkExperienceInput.omit({
  studentId: true,
}).extend({
  isCurrentRole: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();
  const workExperience = form.get('workExperience');

  if (workExperience === 'no') {
    return redirect(Route['/onboarding/community']);
  }

  const { data, errors, ok } = await validateForm(
    form,
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

  return redirect(Route['/onboarding/community']);
}

export default function OnboardingWorkForm() {
  const { workExperience } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { error } = getErrors(actionData);
  const [hasWorkExperience, setHasWorkExperience] = useState(!!workExperience);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setHasWorkExperience(e.target.value === 'yes');
  }

  return (
    <Form className="form" method="post">
      <OnboardingSectionTitle>Work Experience</OnboardingSectionTitle>

      <Field
        error={undefined}
        label="Have you had any work experience relevant to your career goals?"
        labelFor="workExperience"
        required
      >
        <Radio.Group
          defaultValue={
            workExperience ? (hasWorkExperience ? 'yes' : 'no') : undefined
          }
        >
          <Radio
            color="lime-100"
            label="Yes, I have relevant work experience."
            id="workExperienceYes"
            name="workExperience"
            onChange={onChange}
            required
            value="yes"
          />
          <Radio
            color="amber-100"
            label="No, I don't have relevant work experience."
            id="workExperienceNo"
            name="workExperience"
            onChange={onChange}
            required
            value="no"
          />
        </Radio.Group>
      </Field>

      {hasWorkExperience && <WorkExperienceForm />}

      <ErrorMessage>{error}</ErrorMessage>

      <OnboardingButtonGroup>
        <OnboardingBackButton to="/onboarding/education" />
        <OnboardingContinueButton />
      </OnboardingButtonGroup>
    </Form>
  );
}

function WorkExperienceForm() {
  const { workExperience } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { errors } = getErrors(actionData);

  return (
    <>
      <Divider />
      <OnboardingSectionDescription>
        Tell us more about your most recent relevant work experience.
      </OnboardingSectionDescription>

      {workExperience ? (
        <WorkForm.Context
          defaultValue={{
            isCurrentRole: !workExperience.endDate,
            isOtherCompany: !workExperience.companyId,
          }}
        >
          <WorkForm.TitleField
            defaultValue={workExperience.title}
            error={errors.title}
            name="title"
          />
          <WorkForm.EmploymentTypeField
            defaultValue={workExperience.employmentType as EmploymentType}
            error={errors.employmentType}
            name="employmentType"
          />
          <WorkForm.CompanyField
            defaultValue={
              workExperience.companyId
                ? {
                    id: workExperience.companyId!,
                    name: workExperience.companyName!,
                  }
                : {
                    id: '',
                    name: 'Other',
                  }
            }
            error={errors.companyId}
            name="companyId"
          />
          <WorkForm.OtherCompanyField
            defaultValue={workExperience.otherCompany || undefined}
            error={errors.companyName}
            name="companyName"
          />
          <WorkForm.LocationTypeField
            defaultValue={workExperience.locationType as LocationType}
            error={errors.locationType}
            name="locationType"
          />

          <Address>
            <Address.HalfGrid>
              <WorkForm.CityField
                defaultValue={workExperience.locationCity || undefined}
                error={errors.locationCity}
                name="locationCity"
              />
              <WorkForm.StateField
                defaultValue={workExperience.locationState || undefined}
                error={errors.locationState}
                name="locationState"
              />
            </Address.HalfGrid>
          </Address>

          <WorkForm.CurrentRoleField
            defaultValue={!workExperience.endDate}
            error={errors.isCurrentRole}
            name="isCurrentRole"
          />

          <div className="grid grid-cols-1 gap-[inherit] @[520px]:grid-cols-2">
            <WorkForm.StartDateField
              defaultValue={workExperience.startDate?.slice(0, 7)}
              error={errors.startDate}
              name="startDate"
            />
            <WorkForm.EndDateField
              defaultValue={workExperience.endDate?.slice(0, 7)}
              error={errors.endDate}
              name="endDate"
            />
          </div>

          <input type="hidden" name="id" value={workExperience?.id} />
        </WorkForm.Context>
      ) : (
        <WorkForm.Context>
          <WorkForm.TitleField error={errors.title} name="title" />
          <WorkForm.EmploymentTypeField
            error={errors.employmentType}
            name="employmentType"
          />
          <WorkForm.CompanyField error={errors.companyId} name="companyId" />
          <WorkForm.OtherCompanyField
            error={errors.companyName}
            name="companyName"
          />
          <WorkForm.LocationTypeField
            error={errors.locationType}
            name="locationType"
          />

          <Address>
            <Address.HalfGrid>
              <WorkForm.CityField
                error={errors.locationCity}
                name="locationCity"
              />
              <WorkForm.StateField
                error={errors.locationState}
                name="locationState"
              />
            </Address.HalfGrid>
          </Address>

          <WorkForm.CurrentRoleField
            error={errors.isCurrentRole}
            name="isCurrentRole"
          />

          <div className="grid grid-cols-1 gap-[inherit] @[520px]:grid-cols-2">
            <WorkForm.StartDateField
              error={errors.startDate}
              name="startDate"
            />
            <WorkForm.EndDateField error={errors.endDate} name="endDate" />
          </div>
        </WorkForm.Context>
      )}
    </>
  );
}
