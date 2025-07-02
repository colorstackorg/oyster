import {
  type ActionFunctionArgs,
  data,
  Form,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
} from 'react-router';

import { createSchool } from '@oyster/core/education';
import { CreateSchoolInput } from '@oyster/core/education/types';
import {
  SchoolCityField,
  SchoolNameField,
  SchoolStateField,
  SchoolZipField,
} from '@oyster/core/education/ui';
import { Button, getErrors, Modal, validateForm } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, CreateSchoolInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  await createSchool(result.data);

  toast(session, {
    message: 'Created school.',
  });

  const url = new URL(request.url);

  url.pathname = Route['/schools'];

  return redirect(url.toString(), {
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

      <Form className="form" method="post">
        <SchoolNameField error={errors.name} />
        <SchoolCityField error={errors.addressCity} />
        <SchoolStateField error={errors.addressState} />
        <SchoolZipField error={errors.addressZip} />

        <Button.Group>
          <Button.Submit>Create</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
