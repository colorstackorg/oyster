import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  Outlet,
  Form as RemixForm,
  useActionData,
  useSearchParams,
} from '@remix-run/react';

import {
  Button,
  Dashboard,
  DatePicker,
  Form,
  getErrors,
  Input,
  Modal,
  Select,
  Textarea,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  // params.id

  return json({});
}

export async function action() {
  return json({});
}

export default function EditOpportunity() {
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/opportunities'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Edit Opportunity</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <EditOpportunityForm />
    </Modal>
  );
}

function EditOpportunityForm() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post" encType="multipart/form-data">
      <Form.Field error="" label="Type" labelFor="type" required>
        <Select defaultValue="" id="type" name="type" required>
          <option value="job">Job (ie: Internship, Full-Time)</option>
          <option value="event">Event (ie: Conference, Workshop)</option>
          <option value="other">Other (ie: Program, Scholarship)</option>
        </Select>
      </Form.Field>

      <Form.Field error="" label="Title" labelFor="title" required>
        <Input defaultValue="" id="title" name="title" required />
      </Form.Field>

      <Form.Field error="" label="Description" labelFor="description">
        <Textarea
          defaultValue=""
          id="description"
          maxLength={200}
          minRows={2}
          name="description"
        />
      </Form.Field>

      <Form.Field
        description="This is the date that the opportunity will be marked as closed."
        error=""
        label="Close Date"
        labelFor="closeDate"
        required
      >
        <DatePicker
          defaultValue=""
          id="closeDate"
          name="closeDate"
          required
          type="date"
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>Save</Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
