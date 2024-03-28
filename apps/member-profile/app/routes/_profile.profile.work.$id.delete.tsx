import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigate,
} from '@remix-run/react';

import { Button, Form, Modal } from '@oyster/core-ui';

import { Route } from '../shared/constants';
import { deleteWorkExperience, getWorkExperience } from '../shared/core.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '../shared/session.server';

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
    });
  }
}

export default function DeleteWorkExperiencePage() {
  const { error } = useActionData<typeof action>() || {};

  const navigate = useNavigate();

  function onClose() {
    navigate(Route['/profile/work']);
  }

  function onBack() {
    navigate(-1);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Delete Work Experience</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to delete this work experience?
      </Modal.Description>

      <RemixForm className="form" method="post">
        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group flexDirection="row-reverse">
          <Button color="error" type="submit" variant="secondary">
            Delete
          </Button>

          <Button onClick={onBack} type="button" variant="secondary">
            Back
          </Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}

export function ErrorBoundary() {
  return <></>;
}
