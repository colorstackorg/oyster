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
import {
  findResourceByUrl,
  getResource,
  updateResource,
} from '@oyster/core/resources/server';
import {
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

  const { data, errors, ok } = await validateForm(
    {
      ...Object.fromEntries(form),
      attachments: form.getAll('attachments'),
    },
    UpdateResourceInput
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  // Editing resource with a new link that already exisits
  if (data.link) {
    const existingResource = await findResourceByUrl(data.link);

    if (existingResource && existingResource.id !== params.id) {
      const errors: Record<'message' | 'resourceId', string> = {
        message: 'A resource with this link has already been added.',
        resourceId: existingResource.id,
      };

      return json({ errors });
    }
  }

  await updateResource(params.id as string, {
    attachments: data.attachments,
    description: data.description,
    link: data.link,
    tags: data.tags,
    title: data.title,
  });

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
            error={
              'message' in errors && 'resourceId' in errors ? (
                <span>
                  {errors.message as string}{' '}
                  <Link
                    to={`/resources?id=${errors.resourceId}`}
                    className="text-blue-600 hover:underline"
                  >
                    View it here
                  </Link>
                </span>
              ) : (
                errors.link
              )
            }
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
