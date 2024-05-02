import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';
import { z } from 'zod';

import { Button, Form, getActionErrors, Modal, validateForm } from '@oyster/ui';

import {
  OnboardingSessionAttendeesField,
  OnboardingSessionForm,
} from '../shared/components/onboarding-session-form';
import { Route } from '../shared/constants';
import { uploadOnboardingSession } from '../shared/core.server';
import { OnboardingSession } from '../shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    allowAmbassador: true,
  });

  return json({});
}

const UploadOnboardingSessionInput = OnboardingSession.pick({
  date: true,
}).extend({
  attendees: z
    .string()
    .trim()
    .min(1, { message: 'Please select at least one attendee.' })
    .transform((value) => value.split(',')),
});

type UploadOnboardingSessionInput = z.infer<
  typeof UploadOnboardingSessionInput
>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    allowAmbassador: true,
  });

  const form = await request.formData();

  const { data, errors } = validateForm(
    UploadOnboardingSessionInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Please fix the errors above.',
      errors,
    });
  }

  try {
    await uploadOnboardingSession(data);

    toast(session, {
      message: 'Uploaded onboarding session.',
      type: 'success',
    });

    return redirect(Route['/onboarding-sessions'], {
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

const { attendees, date } = UploadOnboardingSessionInput.keyof().enum;

export default function UploadOnboardingSessionPage() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/onboarding-sessions']}>
      <Modal.Header>
        <Modal.Title>Upload Onboarding Session</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <OnboardingSessionForm.DateField error={errors.date} name={date} />
        <OnboardingSessionAttendeesField
          error={errors.attendees}
          name={attendees}
        />

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Upload</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
