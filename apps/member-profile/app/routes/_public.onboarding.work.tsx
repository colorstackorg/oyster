import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { z } from 'zod';

import { addWorkExperience } from '@oyster/core/member-profile/server';
import { AddWorkExperienceInput } from '@oyster/core/member-profile/ui';
import {
  Address,
  Button,
  Divider,
  ErrorMessage,
  Field,
  getErrors,
  Radio,
  validateForm,
} from '@oyster/ui';

import { WorkForm } from '@/modules/employment/ui/work-form';
import {
  OnboardingButtonGroup,
  SectionDescription,
  SectionTitle,
} from '@/routes/_public.onboarding';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

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

import { ContinueButton } from '@/routes/_public.onboarding';
import { BackButton } from '@/routes/_public.onboarding';

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

  return redirect(Route['/onboarding/social']);
}

export default function WorkHistoryForm() {
  const actionData = useActionData<typeof action>();
  const { error } = getErrors(actionData);
  const [hasWorkExperience, setHasWorkExperience] = useState(false);

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
        <Radio.Group defaultValue="">
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
        <WorkForm.TitleField error={errors.title} name="title" />
        <WorkForm.EmploymentTypeField
          error={errors.employmentType}
          name="employmentType"
        />
        <WorkForm.CompanyField
          error={errors.companyCrunchbaseId}
          name="companyCrunchbaseId"
        />
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
        <WorkForm.StartDateField error={errors.startDate} name="startDate" />
        <WorkForm.EndDateField error={errors.endDate} name="endDate" />
      </WorkForm.Context>
    </>
  );
}
