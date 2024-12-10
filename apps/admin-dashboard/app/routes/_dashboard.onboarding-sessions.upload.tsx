import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { z } from 'zod';

import { uploadOnboardingSession } from '@oyster/core/admin-dashboard/server';
import { OnboardingSession } from '@oyster/core/admin-dashboard/ui';
import {
  Button,
  ErrorMessage,
  getErrors,
  Modal,
  validateForm,
} from '@oyster/ui';

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
    minimumRole: 'ambassador',
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
    minimumRole: 'ambassador',
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

      <Form className="form" method="post">
        <OnboardingSessionForm.DateField error={errors.date} name={keys.date} />
        <OnboardingSessionAttendeesField
          error={errors.attendees}
          name={keys.attendees}
        />

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Upload</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
