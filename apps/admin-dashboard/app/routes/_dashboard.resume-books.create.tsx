import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useActionData } from '@remix-run/react';

import {
  Button,
  DatePicker,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { createResumeBook } from '@/member-profile.server';
import { CreateResumeBookInput } from '@/member-profile.ui';
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

  const form = await request.formData();

  const { data, errors } = validateForm(
    CreateResumeBookInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
  }

  await createResumeBook({
    airtableBaseId: data.airtableBaseId,
    airtableTableId: data.airtableTableId,
    endDate: data.endDate,
    name: data.name,
    startDate: data.startDate,
  });

  toast(session, {
    message: 'Created resume book.',
    type: 'success',
  });

  return redirect(Route['/resume-books'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const keys = CreateResumeBookInput.keyof().enum;

export default function CreateResumeBookModal() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/resume-books']}>
      <Modal.Header>
        <Modal.Title>Create Resume Book</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <Form.Field
          error={errors.name}
          label="Name"
          labelFor={keys.name}
          required
        >
          <Input
            id={keys.name}
            name={keys.name}
            required
            placeholder="Spring '24"
          />
        </Form.Field>

        <Form.Field
          description="This is the ID of the Airtable base that the resume book responses will be sent to."
          error={errors.airtableBaseId}
          label="Airtable Base ID"
          labelFor={keys.airtableBaseId}
          required
        >
          <Input id={keys.airtableBaseId} name={keys.airtableBaseId} required />
        </Form.Field>

        <Form.Field
          description="This is the ID of the Airtable table that the resume book responses will be sent to."
          error={errors.airtableTableId}
          label="Airtable Table ID"
          labelFor={keys.airtableTableId}
          required
        >
          <Input
            id={keys.airtableTableId}
            name={keys.airtableTableId}
            required
          />
        </Form.Field>

        <Form.Field
          description="The date that the resume book should start accepting responses."
          error={errors.startDate}
          label="Start Date"
          labelFor={keys.startDate}
          required
        >
          <DatePicker
            id={keys.startDate}
            name={keys.startDate}
            type="date"
            required
          />
        </Form.Field>

        <Form.Field
          description="The date that the resume book should stop accepting responses."
          error={errors.endDate}
          label="End Date"
          labelFor={keys.endDate}
          required
        >
          <DatePicker
            id={keys.endDate}
            name={keys.endDate}
            type="date"
            required
          />
        </Form.Field>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Create</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
