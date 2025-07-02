import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  generatePath,
  useActionData,
  useSearchParams,
} from '@remix-run/react';
import { ArrowRight } from 'react-feather';

import {
  addOpportunity,
  AddOpportunityInput,
} from '@oyster/core/opportunities';
import {
  Button,
  ErrorMessage,
  Field,
  getErrors,
  Input,
  Modal,
  validateForm,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  form.set('postedBy', user(session));

  const result = await validateForm(form, AddOpportunityInput);

  if (!result.ok) {
    return json(result, { status: 400 });
  }

  const addResult = await addOpportunity(result.data);

  if (!addResult.ok) {
    return json({ error: addResult.error }, { status: addResult.code });
  }

  toast(session, {
    message: 'Added opportunity!',
    type: 'success',
  });

  const url = new URL(request.url);

  url.pathname = generatePath(Route['/opportunities/:id/edit'], {
    id: addResult.data.id,
  });

  // When we redirect to the edit page, we want to show some additional
  // information and this will be the way that the edit route knows that it's
  // a new opportunity.
  session.flash('isNewOpportunity', true);

  return redirect(url.toString(), {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function AddOpportunityModal() {
  const { error, errors } = getErrors(useActionData<typeof action>());
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/opportunities'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Add Opportunity</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post">
        <Field
          description="Please paste the full URL of the opportunity. We will use AI to extract the important details from the link. This can take up to 15 seconds."
          error={errors.link}
          label="Link"
          labelFor="link"
          required
        >
          <Input id="link" name="link" placeholder="https://..." required />
        </Field>

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>
            Next <ArrowRight size={20} />
          </Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
