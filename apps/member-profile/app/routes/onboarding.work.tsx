import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { z } from 'zod';

import { addWorkExperience } from '@oyster/core/member-profile/server';
import {
  AddWorkExperienceInput,
  type EmploymentType,
  type LocationType,
} from '@oyster/core/member-profile/ui';
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

import { WorkForm } from '@/modules/employment/ui/work-form';
import {
  BackButton,
  ContinueButton,
  OnboardingButtonGroup,
  SectionDescription,
  SectionTitle,
} from '@/routes/onboarding';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const workExperience = await db
    .selectFrom('workExperiences')
    .leftJoin('companies', 'companies.id', 'workExperiences.companyId')
    .select([
      'companies.crunchbaseId as companyCrunchbaseId',
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

  return redirect(Route['/onboarding/socials']);
}

export default function WorkHistoryForm() {
  const { workExperience } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { error } = getErrors(actionData);
  const [hasWorkExperience, setHasWorkExperience] = useState(!!workExperience);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setHasWorkExperience(e.target.value === 'yes');
  }

  return (
    <Form className="form" method="post">
      <SectionTitle>Work Experience</SectionTitle>

      <Field
        error={undefined}
        label="Have you had any work experience relevant to your career goals?"
        labelFor="workExperience"
        required
      >
        <Radio.Group defaultValue={hasWorkExperience ? 'yes' : 'no'}>
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
        <BackButton to="/onboarding/education" />
        <ContinueButton />
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
      <SectionDescription>
        Tell us more about your most recent relevant work experience. Note that
        other members will be able to see this.
      </SectionDescription>

      <WorkForm.Context>
        <WorkForm.TitleField
          defaultValue={workExperience?.title}
          error={errors.title}
          name="title"
        />
        <WorkForm.EmploymentTypeField
          defaultValue={workExperience?.employmentType as EmploymentType}
          error={errors.employmentType}
          name="employmentType"
        />
        <WorkForm.CompanyField
          defaultValue={
            workExperience?.companyId
              ? {
                  crunchbaseId: workExperience.companyCrunchbaseId!,
                  name: workExperience.companyName!,
                }
              : {
                  crunchbaseId: '',
                  name: '',
                }
          }
          error={errors.companyCrunchbaseId}
          name="companyCrunchbaseId"
        />
        <WorkForm.OtherCompanyField
          defaultValue={workExperience?.otherCompany || undefined}
          error={errors.companyName}
          name="companyName"
        />
        <WorkForm.LocationTypeField
          defaultValue={workExperience?.locationType as LocationType}
          error={errors.locationType}
          name="locationType"
        />

        <Address>
          <Address.HalfGrid>
            <WorkForm.CityField
              defaultValue={workExperience?.locationCity || undefined}
              error={errors.locationCity}
              name="locationCity"
            />
            <WorkForm.StateField
              defaultValue={workExperience?.locationState || undefined}
              error={errors.locationState}
              name="locationState"
            />
          </Address.HalfGrid>
        </Address>

        <WorkForm.CurrentRoleField
          defaultValue={!workExperience?.endDate}
          error={errors.isCurrentRole}
          name="isCurrentRole"
        />
        <WorkForm.StartDateField
          defaultValue={workExperience?.startDate?.slice(0, 7)}
          error={errors.startDate}
          name="startDate"
        />
        <WorkForm.EndDateField
          defaultValue={workExperience?.endDate?.slice(0, 7)}
          error={errors.endDate}
          name="endDate"
        />
      </WorkForm.Context>

      <input type="hidden" name="id" value={workExperience?.id} />
    </>
  );
}
