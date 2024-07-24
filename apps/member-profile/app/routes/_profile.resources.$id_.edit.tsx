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
  Form as RemixForm,
  useActionData,
  useLoaderData,
  useSearchParams,
} from '@remix-run/react';

import { type ResourceType, UpdateResourceInput } from '@oyster/core/resources';
import { getResource, updateResource } from '@oyster/core/resources.server';
import {
  Button,
  Divider,
  Form,
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

  let form: FormData;

  try {
    form = await parseMultipartFormData(request, uploadHandler);
  } catch (e) {
    return json({
      errors: {
        attachments: 'Attachment is too big. Must be less than 20 MB in size.',
      } as Record<keyof UpdateResourceInput, string>,
    });
  }

  const { data, errors, ok } = await validateForm(
    {
      ...Object.fromEntries(form),
      attachments: form.getAll('attachments').filter((file) => {
        return (file as File).size!;
      }),
    },
    UpdateResourceInput
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
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

      <RemixForm className="form" method="post" encType="multipart/form-data">
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
            error={errors.link}
            name={keys.link}
          />
          <ResourceAttachmentField
            error={errors.attachments}
            name={keys.attachments}
            required={false}
          />
        </ResourceProvider>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
