import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigate,
} from '@remix-run/react';

import { db } from '@oyster/db';
import { Button, Form, Modal, Select } from '@oyster/ui';

import { createGoodyOrder } from '@/modules/goody/goody.core';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);
  const student = await getStudent(params.id as string);

  if (!student) {
    return redirect(Route['/students']);
  }

  return json({ student });
}

async function getStudent(id: string) {
  const row = await db
    .selectFrom('students')
    .select(['firstName', 'lastName'])
    .where('id', '=', id)
    .execute();

  return row;
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  try {
    await createGoodyOrder(params.id as string);

    toast(session, {
      message: 'Gift Sent.',
    });

    return redirect(Route['/students'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}

export default function SendGiftPage() {
  const { error } = useActionData<typeof action>() || {};

  const navigate = useNavigate();

  const giftOptions = [{ id: 0, name: 'DoorDash Gift Card' }];

  function onBack() {
    navigate(-1);
  }

  return (
    <Modal onCloseTo={Route['/students']}>
      <Modal.Header>
        <Modal.Title>Send Gift</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>What gift would you like to send?</Modal.Description>

      <RemixForm className="form" method="post">
        <Form.ErrorMessage>{error}</Form.ErrorMessage>
        <Select placeholder="Select a gift...">
          {giftOptions.map((gift) => {
            return (
              <option key={gift.id} value={gift.id}>
                {gift.name}
              </option>
            );
          })}
        </Select>

        <Button.Group flexDirection="row-reverse">
          <Button type="submit">Send Gift</Button>

          <Button onClick={onBack} type="button" variant="secondary">
            Back
          </Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
