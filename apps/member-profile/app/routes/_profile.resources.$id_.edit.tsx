import {
  type ActionFunctionArgs,
  unstable_composeUploadHandlers as composeUploadHandlers,
  unstable_createFileUploadHandler as createFileUploadHandler,
  unstable_createMemoryUploadHandler as createMemoryUploadHandler,
  json,
  type LoaderFunctionArgs,
  unstable_parseMultipartFormData as parseMultipartFormData,
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

import { type ResourceType, UpdateResourceInput } from '@oyster/core/resources';
import { getResource, updateResource } from '@oyster/core/resources/server';
import {
  type AccentColor,
  Button,
  Divider,
  ErrorMessage,
  getErrors,
  Modal,
  validateForm,
} from '@oyster/ui';

import {
  ResourceAttachmentField,
  ResourceDescriptionField,
  ResourceLinkField,
  ResourceProvider,
  ResourceTagsField,
  ResourceTitleField,
} from '@/shared/components/resource-form';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const record = await getResource({
    select: [
      'resources.description',
      'resources.id',
      'resources.link',
      'resources.title',
      'resources.type',
    ],
    where: { id: params.id as string },
  });

  if (!record) {
    throw new Response(null, { status: 404 });
  }

  const resource = {
    ...record,
    type: record.type as ResourceType,
  };

  return json({
    resource,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const uploadHandler = composeUploadHandlers(
    createFileUploadHandler({ maxPartSize: 1_000_000 * 20 }),
    createMemoryUploadHandler()
  );

  const form = await parseMultipartFormData(request, uploadHandler);

  const result = await validateForm(
    {
      ...Object.fromEntries(form),
      attachments: form.getAll('attachments'),
    },
    UpdateResourceInput
  );

  if (!result.ok) {
    return json({ errors: result.errors }, { status: 400 });
  }

  const updateResult = await updateResource(params.id as string, result.data);

  if (!updateResult.ok) {
    return json(
      {
        errors: {
          duplicateResourceId: updateResult.context!.duplicateResourceId,
        },
      },
      { status: updateResult.code }
    );
  }

  toast(session, {
    message: 'Edited resource!',
    type: 'success',
  });

  // TODO: Include query params...

  return redirect(Route['/resources'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const keys = UpdateResourceInput.keyof().enum;

export default function EditResourceModal() {
  const { resource } = useLoaderData<typeof loader>();
  const { error, errors } = getErrors(useActionData<typeof action>());
  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/resources'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Edit Resource</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post" encType="multipart/form-data">
        <ResourceProvider type={resource.type}>
          <ResourceTitleField
            defaultValue={resource.title || undefined}
            error={errors.title}
            name={keys.title}
          />
          <ResourceDescriptionField
            defaultValue={resource.description || undefined}
            error={errors.description}
            name={keys.description}
          />
          <ResourceTagsField
            defaultValue={(resource.tags || []).map((tag) => {
              return {
                color: tag.color as AccentColor,
                label: tag.name,
                value: tag.id,
              };
            })}
            error={errors.tags}
            name={keys.tags}
          />

          <Divider />

          <ResourceLinkField
            defaultValue={resource.link || undefined}
            duplicateResourceId={
              'duplicateResourceId' in errors && errors.duplicateResourceId
            }
            error={errors.link}
            name={keys.link}
          />
          <ResourceAttachmentField
            defaultValue={resource.attachments?.[0]}
            error={errors.attachments}
            name={keys.attachments}
          />
        </ResourceProvider>

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group flexDirection="row-reverse" spacing="between">
          <Button.Submit>Save</Button.Submit>

          <Button.Slot color="error" variant="secondary">
            <Link
              to={generatePath(Route['/resources/:id/delete'], {
                id: resource.id,
              })}
            >
              Delete
            </Link>
          </Button.Slot>
        </Button.Group>
      </Form>
    </Modal>
  );
}
