import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';

import { getSchool, updateSchool } from '@oyster/core/education';
import { UpdateSchoolInput } from '@oyster/core/education/types';
import {
  SchoolCityField,
  SchoolNameField,
  SchoolStateField,
  SchoolTagsField,
  SchoolZipField,
} from '@oyster/core/education/ui';
import { Button, getErrors, Modal, validateForm } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const school = await getSchool({
    select: ['name', 'addressCity', 'addressState', 'addressZip', 'tags'],
    where: { id: params.id as string },
  });

  if (!school) {
    throw new Response(null, { status: 404 });
  }

  return {
    school,
  };
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const result = await validateForm(
    {
      ...Object.fromEntries(form),
      tags: form.getAll('tags').filter(Boolean),
    },
    UpdateSchoolInput.omit({ id: true })
  );

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  await updateSchool({
    ...result.data,
    id: params.id as string,
  });

  toast(session, {
    message: 'Updated school.',
  });

  const url = new URL(request.url);

  url.pathname = Route['/schools'];

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function EditSchoolModal() {
  const { school } = useLoaderData<typeof loader>();
  const { errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/schools']}>
      <Modal.Header>
        <Modal.Title>Edit School</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <SchoolNameField defaultValue={school.name} error={errors.name} />
        <SchoolTagsField defaultValue={school.tags?.[0]} error={errors.tags} />
        <SchoolCityField
          defaultValue={school.addressCity}
          error={errors.addressCity}
        />
        <SchoolStateField
          defaultValue={school.addressState}
          error={errors.addressState}
        />
        <SchoolZipField
          defaultValue={school.addressZip ?? undefined}
          error={errors.addressZip}
        />

        <Button.Group>
          <Button.Submit>Edit</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
