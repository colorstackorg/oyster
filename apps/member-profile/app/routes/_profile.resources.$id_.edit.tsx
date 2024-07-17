import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
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

  const { data, errors, ok } = await validateForm(request, UpdateResourceInput);

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  await updateResource(params.id as string, {
    description: data.description,
    link: data.link,
    tags: data.tags,
    title: data.title,
    attachments: data.attachments,
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

      <RemixForm className="form" method="post">
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

          {resource.link && (
            <>
              <Divider />

              <ResourceLinkField
                defaultValue={resource.link || undefined}
                error={errors.link}
                name={keys.link}
              />
            </>
          )}

          {resource.type == 'file' && (
            <>
              <Divider />

              <ResourceAttachmentField
                error={errors.attachments}
                name={keys.attachments}
              />
            </>
          )}
        </ResourceProvider>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
