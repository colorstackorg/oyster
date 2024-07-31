import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';
import { z } from 'zod';

import { Button, Form, getErrors, Modal, validateForm } from '@oyster/ui';

import { uploadOnboardingSession } from '@/admin-dashboard.server';
import { OnboardingSession } from '@/admin-dashboard.ui';
import {
  OnboardingSessionAttendeesField,
  OnboardingSessionForm,
} from '@/shared/components/onboarding-session-form';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

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
  uploadedById: z.string().trim().min(1),
});

type UploadOnboardingSessionInput = z.infer<
  typeof UploadOnboardingSessionInput
>;

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    allowAmbassador: true,
  });

  const form = await request.formData();

  form.set('uploadedById', user(session));

  const { data, errors, ok } = await validateForm(
    form,
    UploadOnboardingSessionInput
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  try {
    await uploadOnboardingSession(data);

    toast(session, {
      message: 'Uploaded onboarding session.',
    });

    return redirect(Route['/onboarding-sessions'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}

const keys = UploadOnboardingSessionInput.keyof().enum;

export default function UploadOnboardingSessionPage() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/onboarding-sessions']}>
      <Modal.Header>
        <Modal.Title>Upload Onboarding Session</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <OnboardingSessionForm.DateField error={errors.date} name={keys.date} />
        <OnboardingSessionAttendeesField
          error={errors.attendees}
          name={keys.attendees}
        />

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Upload</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
