import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';

import { createSchool } from '@oyster/core/education';
import { CreateSchoolInput } from '@oyster/core/education.types';
import {
  SchoolCityField,
  SchoolNameField,
  SchoolStateField,
  SchoolZipField,
} from '@oyster/core/education.ui';
import { Button, getErrors, Modal, validateForm } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(request, CreateSchoolInput);

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await createSchool({
    addressCity: data.addressCity,
    addressState: data.addressState,
    addressZip: data.addressZip,
    name: data.name,
  });

  toast(session, {
    message: 'Created school.',
  });

  return redirect(Route['/schools'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function CreateSchoolPage() {
  const { errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/schools']}>
      <Modal.Header>
        <Modal.Title>Create School</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <SchoolNameField error={errors.name} />
        <SchoolCityField error={errors.addressCity} />
        <SchoolStateField error={errors.addressState} />
        <SchoolZipField error={errors.addressZip} />

        <Button.Group>
          <Button.Submit>Create</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
