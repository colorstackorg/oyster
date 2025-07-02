import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  generatePath,
  Link,
  useActionData,
  useLoaderData,
  useParams,
  useSearchParams,
} from '@remix-run/react';
import { Plus } from 'react-feather';

import {
  refineOpportunity,
  RefineOpportunityInput,
} from '@oyster/core/opportunities';
import { db } from '@oyster/db';
import {
  Button,
  ErrorMessage,
  Field,
  getErrors,
  Modal,
  Textarea,
  validateForm,
} from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const opportunity = await db
    .selectFrom('opportunities')
    .select('link')
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!opportunity || !opportunity.link) {
    throw new Response(null, {
      status: 404,
      statusText: 'Could not find a link in the opportunity shared.',
    });
  }

  return { link: opportunity.link };
}

export async function action({ params, request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);

  const result = await validateForm(request, RefineOpportunityInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  const refineResult = await refineOpportunity(result.data);

  if (!refineResult.ok) {
    return data({ error: refineResult.error }, { status: refineResult.code });
  }

  const url = new URL(request.url);

  url.pathname = generatePath(Route['/opportunities/:id'], {
    id: params.id as string,
  });

  return redirect(url.toString());
}

export default function RefineOpportunity() {
  const { link } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/opportunities'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Generate Tags with AI</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" data-gap="2rem" method="post">
        <Field
          label="Step 1. Open the link that was shared in a new tab."
          required
        >
          <Link className="link line-clamp-1" to={link} target="_blank">
            {link}
          </Link>
        </Field>

        <Field
          description="You can simply do Ctrl+A and CTRL+C to copy the text content of the page. However, if it is a LinkedIn post, then please only get the actual post content. We'll only use the first 10,000 characters."
          error={errors.content}
          label="Step 2. Paste the website's text content."
          labelFor="content"
          required
        >
          <Textarea
            id="content"
            maxLength={10000}
            minRows={10}
            name="content"
            required
          />
        </Field>

        <input type="hidden" name="opportunityId" value={id} />

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>
            Generate <Plus size={16} />
          </Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
