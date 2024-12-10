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

import {
  editOpportunity,
  EditOpportunityInput,
  getOpportunityDetails,
} from '@oyster/core/opportunities';
import {
  Button,
  DatePicker,
  ErrorMessage,
  FormField,
  getButtonCn,
  getErrors,
  Input,
  Modal,
  Textarea,
  validateForm,
} from '@oyster/ui';

import { OpportunityTagsField } from '@/routes/_profile.opportunities.tags';
import { CompanyCombobox } from '@/shared/components/company-combobox';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

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

  const {
    companyCrunchbaseId,
    companyName,
    description,
    expiresAt,
    id,
    tags,
    title,
  } = opportunity;

  return json({
    companyCrunchbaseId,
    companyName,
    description,
    expiresAt: dayjs(expiresAt).tz(tz).format('YYYY-MM-DD'),
    id,
    tags,
    title,
  });
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
  const {
    companyCrunchbaseId,
    companyName,
    description,
    expiresAt,
    id,
    tags,
    title,
  } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Form className="form" method="post">
      <FormField
        error={errors.companyCrunchbaseId}
        label="Company"
        labelFor="companyCrunchbaseId"
        required
      >
        <CompanyCombobox
          defaultValue={{
            crunchbaseId: companyCrunchbaseId || '',
            name: companyName || '',
          }}
          name="companyCrunchbaseId"
        />
      </FormField>

      <FormField error={errors.title} label="Title" labelFor="title" required>
        <Input defaultValue={title} id="title" name="title" required />
      </FormField>

      <FormField
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
      </FormField>

      <OpportunityTagsField error={errors.tags} tags={tags || []} />

      <FormField
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
      </FormField>

      <ErrorMessage>{error}</ErrorMessage>

      <Button.Group flexDirection="row-reverse" spacing="between">
        <Button.Submit>Save</Button.Submit>

        <Link
          className={getButtonCn({ color: 'error', variant: 'secondary' })}
          to={generatePath(Route['/opportunities/:id/delete'], {
            id: id as string,
          })}
        >
          Delete
        </Link>
      </Button.Group>
    </Form>
  );
}
