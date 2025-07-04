import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
} from 'react-router';
import { z } from 'zod';

import { addOnboardingSessionAttendees } from '@oyster/core/admin-dashboard/server';
import { db } from '@oyster/db';
import {
  Button,
  ErrorMessage,
  getErrors,
  Modal,
  validateForm,
} from '@oyster/ui';

import { OnboardingSessionAttendeesField } from '@/shared/components/onboarding-session-form';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'ambassador',
  });

  const onboardingSession = await db
    .selectFrom('onboardingSessions')
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!onboardingSession) {
    throw new Response(null, { status: 404 });
  }

  return null;
}

const AddOnboardingSessionAttendeesInput = z.object({
  attendees: z
    .string()
    .trim()
    .min(1, { message: 'Please select at least one attendee.' })
    .transform((value) => value.split(',')),
});

type AddOnboardingSessionAttendeesInput = z.infer<
  typeof AddOnboardingSessionAttendeesInput
>;

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    minimumRole: 'ambassador',
  });

  const result = await validateForm(
    request,
    AddOnboardingSessionAttendeesInput
  );

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  await addOnboardingSessionAttendees(params.id as string, result.data);

  toast(session, {
    message: `Added ${result.data.attendees.length} attendees.`,
  });

  return redirect(Route['/onboarding-sessions'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const keys = AddOnboardingSessionAttendeesInput.keyof().enum;

export default function AddOnboardingSessionAttendeesPage() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/onboarding-sessions']}>
      <Modal.Header>
        <Modal.Title>Add Onboarding Session Attendees</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
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
