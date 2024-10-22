import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import { Plus, Tag } from 'react-feather';

import {
  editOpportunity,
  updateOpportunityWithAI,
} from '@oyster/core/opportunities';
import { EditOpportunityInput } from '@oyster/core/opportunities/types';
import { db } from '@oyster/db';
import {
  Button,
  Form,
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
    .leftJoin(
      'slackMessages',
      'slackMessages.id',
      'opportunities.slackMessageId'
    )
    .select(['slackMessages.text'])
    .where('opportunities.id', '=', params.id as string)
    .executeTakeFirst();

  if (!opportunity) {
    throw new Response(null, {
      status: 404,
      statusText: 'The opportunity you are trying to edit does not exist.',
    });
  }

  const link = opportunity.text?.match(/<?(https?:\/\/[^\s>]+)>?/)?.[1];

  if (!link) {
    throw new Response(null, {
      status: 404,
      statusText: 'Could not find a link in the opportunity shared.',
    });
  }

  return json({
    opportunity: {
      ...opportunity,
      link,
    },
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const formData = await request.formData();
  const content = formData.get('content') as string;

  // const { data, errors, ok } = await validateForm(
  //   request,
  //   EditOpportunityInput
  // );

  // if (!ok) {
  //   return json({ errors }, { status: 400 });
  // }

  const id = params.id as string;

  const result = await updateOpportunityWithAI(id, content);

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  return redirect(generatePath(Route['/opportunities/:id'], { id }));
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
        <Modal.Title>Generate Tags with AI</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        In order to easily generate tags for the opportunity, we just need to
        provide more context to our AI system! But, we need your help for this!
      </Modal.Description>

      <AddOpportunityContextForm />
    </Modal>
  );
}

function AddOpportunityContextForm() {
  const { opportunity } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <RemixForm className="form" method="post">
      <Form.Field
        error=""
        label="Step 1. Open the link that was shared in a new tab."
        required
      >
        <Link
          className="link line-clamp-1"
          to={opportunity.link}
          target="_blank"
        >
          {opportunity.link}
        </Link>
      </Form.Field>

      <Form.Field
        description="If the link shared is a LinkedIn post, then use the main post's content."
        error=""
        label="Step 2. Copy/paste the main content of the page below."
        labelFor="content"
        required
      >
        <Textarea
          id="content"
          maxLength={5000}
          minRows={10}
          name="content"
          required
        />
      </Form.Field>

      <Form.ErrorMessage>{error}</Form.ErrorMessage>

      <Button.Group>
        <Button.Submit>
          Generate <Plus size={16} />
        </Button.Submit>
      </Button.Group>
    </RemixForm>
  );
}
