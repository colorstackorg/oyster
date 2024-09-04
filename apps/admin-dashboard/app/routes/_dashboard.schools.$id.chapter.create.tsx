import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useLoaderData } from '@remix-run/react';

import { createChapter } from '@oyster/core/chapters';
import { getSchool } from '@oyster/core/education';
import { Button, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const school = await getSchool({
    select: ['name'],
    where: { id: params.id as string },
  });

  if (!school) {
    throw new Response(null, { status: 404 });
  }

  return json({
    school,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await createChapter({
    schoolId: params.id as string,
  });

  toast(session, {
    message: 'Created chapter.',
  });

  return redirect(Route['/schools'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function CreateChapterModal() {
  const { school } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/schools']}>
      <Modal.Header>
        <Modal.Title>Create Chapter for {school.name}</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to create a chapter for {school.name}?
      </Modal.Description>

      <RemixForm className="form" method="post">
        <Button.Group>
          <Button.Submit>Create</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
