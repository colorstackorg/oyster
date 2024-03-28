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
  useNavigation,
} from '@remix-run/react';

import {
  Button,
  Form,
  getActionErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/core-ui';

import { Route } from '../shared/constants';
import { createSchool } from '../shared/core.server';
import { CreateSchoolInput } from '../shared/core.ui';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  const { data, errors } = validateForm(
    CreateSchoolInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: 'Something went wrong, please try again.',
      errors,
    });
  }

  await createSchool({
    addressCity: data.addressCity,
    addressState: data.addressState,
    addressZip: data.addressZip,
    name: data.name,
  });

  toast(session, {
    message: `Created ${data.name}.`,
    type: 'success',
  });

  return redirect(Route.SCHOOLS, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function CreateSchoolPage() {
  const navigate = useNavigate();

  function onClose() {
    navigate(-1);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Create School</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <CreateSchoolForm />
    </Modal>
  );
}

const keys = CreateSchoolInput.keyof().enum;

function CreateSchoolForm() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  const submitting = useNavigation().state === 'submitting';

  return (
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
          placeholder="University of California, Los Angeles"
          required
        />
      </Form.Field>

      <Form.Field
        error={errors.addressCity}
        label="City"
        labelFor={keys.addressCity}
        required
      >
        <Input
          id={keys.addressCity}
          name={keys.addressCity}
          placeholder="Los Angeles"
          required
        />
      </Form.Field>

      <Form.Field
        description="Please use the two-letter abbreviation."
        error={errors.addressState}
        label="State"
        labelFor={keys.addressState}
        required
      >
        <Input
          id={keys.addressState}
          name={keys.addressState}
          placeholder="CA"
          required
        />
      </Form.Field>

      <Form.Field
        error={errors.addressZip}
        label="Zip Code"
        labelFor={keys.addressZip}
        required
      >
        <Input
          id={keys.addressZip}
          name={keys.addressZip}
          placeholder="90210"
          required
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button loading={submitting} type="submit">
          Create
        </Button>
      </Button.Group>
    </RemixForm>
  );
}
