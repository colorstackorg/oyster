import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useNavigate } from '@remix-run/react';

import {
  deleteWorkExperience,
  getWorkExperience,
} from '@oyster/core/member-profile/server';
import { Button, ErrorMessage, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
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
    ['id']
  );

  if (!workExperience) {
    throw new Response(null, { status: 404 });
  }

  return json({});
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  try {
    await deleteWorkExperience({
      id: params.id as string,
      studentId: user(session),
    });

    toast(session, {
      message: 'Deleted work experience.',
    });

    return redirect(Route['/profile/work'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}

export default function DeleteWorkExperiencePage() {
  const { error } = useActionData<typeof action>() || {};

  const navigate = useNavigate();

  function onBack() {
    navigate(-1);
  }

  return (
    <Modal onCloseTo={Route['/profile/work']}>
      <Modal.Header>
        <Modal.Title>Delete Work Experience</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to delete this work experience?
      </Modal.Description>

      <Form className="form" method="post">
        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group flexDirection="row-reverse">
          <Button color="error" type="submit" variant="secondary">
            Delete
          </Button>

          <Button onClick={onBack} type="button" variant="secondary">
            Back
          </Button>
        </Button.Group>
      </Form>
    </Modal>
  );
}

export function ErrorBoundary() {
  return <></>;
}
