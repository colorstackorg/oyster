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
import { Form, Link, useActionData, useSearchParams } from '@remix-run/react';

import { track } from '@oyster/core/mixpanel';
import { AddResourceInput } from '@oyster/core/resources';
import { addResource, findResourceByUrl } from '@oyster/core/resources/server';
import {
  Button,
  Divider,
  ErrorMessage,
  getErrors,
  MB_IN_BYTES,
  Modal,
  validateForm,
} from '@oyster/ui';

import {
  ResourceAttachmentField,
  ResourceDescriptionField,
  ResourceLinkField,
  ResourceProvider,
  ResourceSearchConfirmationField,
  ResourceTagsField,
  ResourceTitleField,
  ResourceTypeField,
} from '@/shared/components/resource-form';
import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const uploadHandler = composeUploadHandlers(
    createFileUploadHandler({ maxPartSize: MB_IN_BYTES * 20 }),
    createMemoryUploadHandler()
  );

  const form = await parseMultipartFormData(request, uploadHandler);

  form.set('postedBy', user(session));

  const { data, errors, ok } = await validateForm(
    {
      ...Object.fromEntries(form),
      attachments: form.getAll('attachments'),
    },
    AddResourceInput
  );

  if (!ok) {
    return json({ errors });
  }

  // Check for duplicate URL if a link is provided
  if (data.link) {
    const existingResource = await findResourceByUrl(data.link);

    if (existingResource) {
      const errors: Record<'message' | 'resourceId', string> = {
        message: 'A resource with this link has already been added.',
        resourceId: existingResource.id,
      };

      return json({ errors });
    }
  }

  await addResource({
    attachments: data.attachments,
    description: data.description,
    link: data.link,
    postedBy: data.postedBy,
    tags: data.tags,
    title: data.title,
    type: data.type,
  });

  track({
    event: 'Resource Added',
    properties: undefined,
    request,
    user: user(session),
  });

  toast(session, {
    message: 'Added resource!',
    type: 'success',
  });

  // TODO: Include query params...

  return redirect(Route['/resources'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const keys = AddResourceInput.keyof().enum;

export default function AddResourceModal() {
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
        <Modal.Title>Add Resource</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Form className="form" method="post" encType="multipart/form-data">
        <ResourceProvider>
          <ResourceSearchConfirmationField name="confirmation" />
          <ResourceTitleField error={errors.title} name={keys.title} />
          <ResourceDescriptionField
            error={errors.description}
            name={keys.description}
          />
          <ResourceTagsField error={errors.tags} name={keys.tags} />
          <Divider />
          <ResourceTypeField error={errors.type} name={keys.type} />
          <ResourceAttachmentField
            error={errors.attachments}
            name={keys.attachments}
          />
          <ResourceLinkField
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
        </ResourceProvider>

        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
