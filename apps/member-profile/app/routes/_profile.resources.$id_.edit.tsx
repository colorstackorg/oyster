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
} from '@remix-run/react';

import { type ResourceType, UpdateResourceInput } from '@oyster/core/resources';
import { getResource, updateResource } from '@oyster/core/resources.server';
import {
  Button,
  Divider,
  Form,
  getActionErrors,
  Modal,
  validateForm,
} from '@oyster/ui';

import {
  DescriptionField,
  ResourceFormProvider,
  ResourceLinkField,
  TagsField,
  TitleField,
} from '@/shared/components/resource-form';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const record = await getResource({
    memberId: user(session),
    select: [
      'resources.description',
      'resources.link',
      'resources.title',
      'resources.type',
    ],
    where: {
      id: params.id as string,
    },
  });

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

  const form = await request.formData();

  const { data, errors } = validateForm(
    UpdateResourceInput,
    Object.fromEntries(form)
  );

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  await updateResource(params.id as string, {
    description: data.description,
    link: data.link,
    tags: data.tags,
    title: data.title,
  });

  toast(session, {
    message: 'Edited resource!',
    type: 'success',
  });

  return redirect(Route['/resources'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const keys = UpdateResourceInput.keyof().enum;

export default function EditResourceModal() {
  const { resource } = useLoaderData<typeof loader>();
  const { error, errors } = getActionErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/resources']}>
      <Modal.Header>
        <Modal.Title>Edit Resource</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="form" method="post">
        <ResourceFormProvider type={resource.type}>
          <TitleField
            defaultValue={resource.title || undefined}
            error={errors.title}
            name={keys.title}
          />
          <DescriptionField
            defaultValue={resource.description || undefined}
            error={errors.description}
            name={keys.description}
          />
          <TagsField
            defaultValue={resource.tags.map((tag) => {
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
        </ResourceFormProvider>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
