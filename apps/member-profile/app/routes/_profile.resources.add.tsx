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
  useSearchParams,
} from '@remix-run/react';

import { AddResourceInput } from '@oyster/core/resources';
import { addResource } from '@oyster/core/resources.server';
import {
  Button,
  Divider,
  Form,
  getActionErrors,
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
    createFileUploadHandler({ maxPartSize: 1_000_000 * 20 }),
    createMemoryUploadHandler()
  );

  const form = await parseMultipartFormData(request, uploadHandler);

  const values = Object.fromEntries(form);

  const { data, errors } = validateForm(
    AddResourceInput.omit({ postedBy: true }),
    values
  );

  if (!data) {
    return json({
      error: '',
      errors,
    });
  }

  await addResource({
    attachments: data.attachments,
    description: data.description,
    link: data.link,
    postedBy: user(session),
    tags: data.tags,
    title: data.title,
    type: data.type,
  });

  toast(session, {
    message: 'Added resource!',
    type: 'success',
  });

  return redirect(Route['/resources'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

const keys = AddResourceInput.keyof().enum;

export default function AddResourceModal() {
  const { error, errors } = getActionErrors(useActionData<typeof action>());
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

      <RemixForm className="form" method="post" encType="multipart/form-data">
        <ResourceProvider>
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
          <ResourceLinkField error={errors.link} name={keys.link} />
        </ResourceProvider>

        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button.Submit>Save</Button.Submit>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
