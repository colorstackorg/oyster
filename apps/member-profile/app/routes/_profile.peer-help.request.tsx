import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Form, useSearchParams } from '@remix-run/react';

import {
  Button,
  DatePicker,
  ErrorMessage,
  Field,
  Modal,
  Textarea,
} from '@oyster/ui';
import { Select } from '@oyster/ui';

import { Route } from '@/shared/constants';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({});
}

// Page

export default function RequestHelpModal() {
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/peer-help'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Request Help</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <Field
          description="These are the types of help we currently support."
          error=""
          label="What type of help do you need?"
          labelFor="type"
          required
        >
          <Select id="type" name="type" required>
            <option value="career_advice">Career Advice</option>
            <option value="mock_interview">Mock Interview</option>
            <option value="resume_review">Resume Review</option>
          </Select>
        </Field>

        <Field
          description=""
          error=""
          label="When do you need help by?"
          labelFor="helpBy"
          required
        >
          <DatePicker
            id="helpBy"
            max=""
            min=""
            name="helpBy"
            type="date"
            required
          />
        </Field>

        <Field
          description="This will help those who are looking to help find the right person."
          error=""
          label="Please describe what you need help with in more detail."
          labelFor="description"
          required
        >
          <Textarea id="description" name="description" />
        </Field>

        <ErrorMessage></ErrorMessage>

        <Button.Group>
          <Button.Submit>Request</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
