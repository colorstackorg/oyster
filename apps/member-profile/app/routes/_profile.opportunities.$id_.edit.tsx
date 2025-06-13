import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  generatePath,
  Link,
  useActionData,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { AlertCircle } from 'react-feather';

import {
  editOpportunity,
  EditOpportunityInput,
  getOpportunityDetails,
} from '@oyster/core/opportunities';
import {
  Button,
  DatePicker,
  ErrorMessage,
  Field,
  getErrors,
  Input,
  Modal,
  Textarea,
  validateForm,
} from '@oyster/ui';
import { Callout } from '@oyster/ui/callout';

import { OpportunityTagsField } from '@/routes/_profile.opportunities.tags';
import { CompanyCombobox } from '@/shared/components/company-combobox';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import {
  commitSession,
  ensureUserAuthenticated,
  user,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const tz = getTimezone(request);

  const opportunity = await getOpportunityDetails({
    memberId: user(session),
    opportunityId: params.id as string,
  });

  if (!opportunity) {
    throw new Response(null, {
      status: 404,
      statusText: 'The opportunity you are trying to edit does not exist.',
    });
  }

  if (!opportunity.hasWritePermission) {
    throw new Response(null, {
      status: 403,
      statusText: 'You do not have permission to edit this opportunity.',
    });
  }

  const isNewOpportunity = session.get('isNewOpportunity');

  const { companyId, companyName, description, expiresAt, id, tags, title } =
    opportunity;

  return json(
    {
      companyId,
      companyName,
      description,
      expiresAt: dayjs(expiresAt).tz(tz).format('YYYY-MM-DD'),
      id,
      isNewOpportunity,
      tags,
      title,
    },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

export async function action({ params, request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);

  const { data, errors, ok } = await validateForm(
    request,
    EditOpportunityInput
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  const opportunityId = params.id as string;

  const result = await editOpportunity(opportunityId, data);

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  const url = new URL(request.url);

  url.pathname = generatePath(Route['/opportunities/:id'], {
    id: opportunityId,
  });

  return redirect(url.toString());
}

export default function EditOpportunity() {
  const { isNewOpportunity } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/opportunities'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>
          {isNewOpportunity ? 'Add Opportunity' : 'Edit Opportunity'}
        </Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      {isNewOpportunity && <NewCallout />}
      <EditOpportunityForm />
    </Modal>
  );
}

function NewCallout() {
  const { tags } = useLoaderData<typeof loader>();

  if (tags?.length) {
    return (
      <Callout color="blue" icon={<AlertCircle />}>
        We extracted the following information from the link using AI. Sometimes
        the information is not 100% accurate, so please review and update as
        needed.
      </Callout>
    );
  }

  return (
    <Callout color="blue" icon={<AlertCircle />}>
      We need a little more information before we can show this opportunity on
      the opportunities board.
    </Callout>
  );
}

function EditOpportunityForm() {
  const { companyId, companyName, description, expiresAt, id, tags, title } =
    useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Form className="form" method="post">
      <Field
        error={errors.companyId}
        label="Company"
        labelFor="companyId"
        required
      >
        <CompanyCombobox
          defaultValue={{ id: companyId || '', name: companyName || '' }}
          name="companyId"
        />
      </Field>

      <Field error={errors.title} label="Title" labelFor="title" required>
        <Input defaultValue={title} id="title" name="title" required />
      </Field>

      <Field
        error={errors.description}
        label="Description"
        labelFor="description"
        required
      >
        <Textarea
          defaultValue={description}
          id="description"
          maxLength={500}
          minRows={5}
          name="description"
          required
        />
      </Field>

      <OpportunityTagsField error={errors.tags} tags={tags || []} />

      <Field
        description="This is the date that the opportunity will no longer be open."
        error={errors.expiresAt}
        label="Expiration Date"
        labelFor="expiresAt"
        required
      >
        <DatePicker
          defaultValue={expiresAt}
          id="expiresAt"
          name="expiresAt"
          required
          type="date"
        />
      </Field>

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group flexDirection="row-reverse" spacing="between">
        <Button.Submit>Save</Button.Submit>

        <Button.Slot color="error" variant="secondary">
          <Link
            to={generatePath(Route['/opportunities/:id/delete'], {
              id: id as string,
            })}
          >
            Delete
          </Link>
        </Button.Slot>
      </Button.Group>
    </Form>
  );
}
